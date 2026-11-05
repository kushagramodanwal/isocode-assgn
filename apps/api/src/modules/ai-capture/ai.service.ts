import { normaliseAliasKey, normalisePhrase } from '@retailer/domain';
import { getLlmClient } from '../../platform/adapters/index.js';
import { BusinessRuleError, NotFoundError } from '../../platform/errors.js';
import { logger } from '../../platform/logger.js';
import { prisma } from '../../platform/prisma.js';

export interface DraftLineOutput {
  originalPhrase: string;
  matchedSkuCode: string;
  skuName: string;
  quantity: number;
  unit: 'case' | 'piece' | 'unknown';
  confidence: 'high' | 'medium' | 'needs_clarification' | 'unresolved';
  clarificationQuestion?: string;
  alternatives: Array<{ skuCode: string; name: string }>;
  stockBand: 'in_stock' | 'low' | 'out';
  unitPricePaise: bigint;
  gstInclusive: boolean;
}

export class AiService {
  private llmClient = getLlmClient();

  async createDraft(retailerId: string, rawMessage: string) {
    if (!rawMessage || rawMessage.trim().length === 0) {
      throw new BusinessRuleError('Message cannot be empty');
    }

    // Spec 5.5: Duplicate message check within 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const existingDraft = await prisma.aiDraft.findFirst({
      where: {
        retailerId,
        rawMessage: rawMessage.trim(),
        createdAt: { gte: twoMinutesAgo },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingDraft) {
      logger.info('Duplicate message within 2 minutes, returning existing draft');
      return existingDraft;
    }

    const normalised = normalisePhrase(rawMessage);
    const now = new Date();

    // 1. Fetch active aliases for this retailer (Spec 5.2 Step 3)
    const aliases = await prisma.alias.findMany({
      where: {
        retailerId,
        active: true,
      },
      include: {
        sku: {
          include: {
            stock: true,
            prices: {
              where: {
                validFrom: { lte: now },
                validTo: { gte: now },
                OR: [{ retailerId: null }, { retailerId }],
              },
            },
          },
        },
      },
    });

    // 2. Fetch all active SKUs (Rule 14: LLM receives code and name only!)
    const allSkus = await prisma.sku.findMany({
      where: { active: true },
      include: {
        stock: true,
        prices: {
          where: {
            validFrom: { lte: now },
            validTo: { gte: now },
            OR: [{ retailerId: null }, { retailerId }],
          },
        },
      },
    });

    const parsedLines: DraftLineOutput[] = [];

    // Step 3: Match aliases first
    for (const alias of aliases) {
      const aliasKey = alias.phraseNormalised;
      if (normalised.includes(aliasKey) || rawMessage.toLowerCase().includes(aliasKey)) {
        // Extract quantity preceding or succeeding the alias phrase if any, default to 5
        const match = rawMessage.match(new RegExp(`(\\d+)\\s*(?:peti|case)?\\s*${aliasKey}`, 'i')) ||
                      rawMessage.match(new RegExp(`${aliasKey}[^\\d]*(\\d+)`, 'i'));
        const qty = match ? parseInt(match[1], 10) : 5;

        const sku = alias.sku;
        const onHand = sku.stock?.onHandCases ?? 0;
        const stockBand = onHand <= 0 ? 'out' : onHand < 20 ? 'low' : 'in_stock';
        const price = sku.prices.find((p) => p.retailerId === retailerId) || sku.prices.find((p) => p.retailerId === null);

        parsedLines.push({
          originalPhrase: alias.phraseNormalised,
          matchedSkuCode: sku.code,
          skuName: sku.name,
          quantity: qty,
          unit: 'case',
          confidence: 'high', // Exact retailer alias match is high (Spec 5.4)
          alternatives: [],
          stockBand,
          unitPricePaise: price?.pricePaise ?? 0n,
          gstInclusive: price?.gstInclusive ?? true,
        });
      }
    }

    // Step 4: LLM extraction for unmatched content
    let modelResponse: any = null;
    let draftStatus = 'draft';

    try {
      const candidates = allSkus.map((s) => ({ code: s.code, name: s.name }));
      const llmResult = await this.llmClient.extractOrder(rawMessage, candidates);
      modelResponse = llmResult.rawResponse;

      for (const item of llmResult.lines) {
        // Avoid duplicating what the alias already caught
        if (parsedLines.some((p) => p.matchedSkuCode === item.skuCode)) {
          continue;
        }

        const sku = allSkus.find((s) => s.code === item.skuCode);
        if (!sku) {
          logger.warn(`Model suggested unknown SKU: ${item.skuCode}`);
          continue;
        }

        const onHand = sku.stock?.onHandCases ?? 0;
        const stockBand = onHand <= 0 ? 'out' : onHand < 20 ? 'low' : 'in_stock';
        const price = sku.prices.find((p) => p.retailerId === retailerId) || sku.prices.find((p) => p.retailerId === null);

        // Confidence scoring (Spec 5.4):
        let confidence: 'high' | 'medium' | 'needs_clarification' | 'unresolved' = 'high';
        let clarificationQuestion: string | undefined = undefined;

        if (item.unit === 'unknown') {
          confidence = 'needs_clarification';
          clarificationQuestion = 'Cases or pieces?';
        }

        // Alternatives: find up to 2 other SKUs in same brand
        const alternatives = allSkus
          .filter((s) => s.brand === sku.brand && s.code !== sku.code)
          .slice(0, 2)
          .map((s) => ({ skuCode: s.code, name: s.name }));

        parsedLines.push({
          originalPhrase: item.rawPhrase || sku.name,
          matchedSkuCode: sku.code,
          skuName: sku.name,
          quantity: item.quantity > 0 ? item.quantity : 1,
          unit: item.unit,
          confidence,
          clarificationQuestion,
          alternatives,
          stockBand,
          unitPricePaise: price?.pricePaise ?? 0n,
          gstInclusive: price?.gstInclusive ?? true,
        });
      }
    } catch (err: any) {
      logger.error('LLM extraction error, switching to manual entry required', {
        error: err.message,
      });
      draftStatus = 'manual_entry_required';
    }

    if (parsedLines.length === 0 && draftStatus !== 'manual_entry_required') {
      draftStatus = 'manual_entry_required';
    }

    // Save AiDraft
    const draft = await prisma.aiDraft.create({
      data: {
        retailerId,
        rawMessage: rawMessage.trim(),
        normalisedMessage: normalised,
        modelResponse: modelResponse || null,
        lines: parsedLines as any,
        status: draftStatus,
      },
    });

    return draft;
  }

  async getDraft(draftId: string, retailerId: string) {
    const draft = await prisma.aiDraft.findUnique({
      where: { id: draftId },
    });

    if (!draft || draft.retailerId !== retailerId) {
      throw new NotFoundError('Draft not found');
    }

    return draft;
  }
}
