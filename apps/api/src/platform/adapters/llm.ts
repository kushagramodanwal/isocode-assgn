import { logger } from '../logger.js';

export interface LlmSkuCandidate {
  code: string;
  name: string;
}

export interface LlmParsedLine {
  rawPhrase: string;
  skuCode: string;
  quantity: number;
  unit: 'case' | 'piece' | 'unknown';
}

export interface LlmExtractionResult {
  lines: LlmParsedLine[];
  rawResponse?: any;
}

export interface LlmClient {
  extractOrder(
    message: string,
    candidates: LlmSkuCandidate[]
  ): Promise<LlmExtractionResult>;
}

export class MockLlmClient implements LlmClient {
  async extractOrder(
    message: string,
    candidates: LlmSkuCandidate[]
  ): Promise<LlmExtractionResult> {
    logger.info('[MockLlmClient] Extracting items from message');

    const lower = message.toLowerCase();
    const lines: LlmParsedLine[] = [];

    // Check for washing powder
    if (lower.includes('washing powder') || lower.includes('detergent')) {
      const match = lower.match(/(\d+)\s*(?:peti|pati|case)?\s*(?:washing powder|detergent)/);
      const qty = match ? parseInt(match[1], 10) : 2;
      lines.push({
        rawPhrase: 'washing powder 1 kilo',
        skuCode: 'SKU-DT-1KG',
        quantity: qty,
        unit: 'case',
      });
    }

    // Check for chai patti / tea
    if (lower.includes('chai') || lower.includes('tea')) {
      const match = lower.match(/(?:chai patti|tea)[^\d]*(\d+)\s*(?:peti|pati|case)?/);
      const qty = match ? parseInt(match[1], 10) : 1;
      lines.push({
        rawPhrase: 'chai patti 250',
        skuCode: 'SKU-TE-250',
        quantity: qty,
        unit: 'case',
      });
    }

    // Check for biscuit if not caught by alias
    if (lower.includes('biscuit') && !lines.some((l) => l.skuCode === 'SKU-BS-075')) {
      lines.push({
        rawPhrase: 'biscuit',
        skuCode: 'SKU-BS-075',
        quantity: 5,
        unit: 'case',
      });
    }

    return {
      lines,
      rawResponse: { provider: 'mock', extractedCount: lines.length },
    };
  }
}

export class GeminiLlmClient implements LlmClient {
  constructor(private apiKey?: string) {}

  async extractOrder(
    message: string,
    candidates: LlmSkuCandidate[]
  ): Promise<LlmExtractionResult> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const candidateList = candidates.map((c) => `- ${c.code}: ${c.name}`).join('\n');
    const prompt = `You are an AI order extraction assistant for FMCG retail orders in India.
Retailer sent this WhatsApp/SMS order message:
"${message}"

Available Catalog SKUs:
${candidateList}

Allowed units: "case", "piece", "unknown".

Return a strictly valid JSON object with the shape:
{
  "lines": [
    {
      "rawPhrase": "text from message",
      "skuCode": "EXACT_SKU_CODE_FROM_CATALOG",
      "quantity": 1,
      "unit": "case" | "piece" | "unknown"
    }
  ]
}
Only output valid JSON. No explanations, no markdown fences.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per Spec 5.2

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      const parsed = JSON.parse(text);
      return {
        lines: parsed.lines || [],
        rawResponse: json,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      logger.error('Gemini API call failed', { error: err.message });
      throw err;
    }
  }
}
