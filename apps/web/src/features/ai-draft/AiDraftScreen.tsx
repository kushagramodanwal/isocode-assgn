import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ConfidenceBadge, MockBadge, StockBadge } from '../../components/Badges';
import { Button } from '../../components/Button';
import { Money } from '../../components/Money';
import { Stepper } from '../../components/Stepper';
import { useI18n } from '../../i18n';
import { apiRequest } from '../../lib/api';

const DEMO_MESSAGE =
  'bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti';

export function AiDraftScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [draft, setDraft] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmedLines, setConfirmedLines] = useState<
    Array<{ skuCode: string; cases: number; unit: string }>
  >([]);

  const handleProcessMessage = async (msgText: string) => {
    if (!msgText.trim()) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await apiRequest<any>('/api/v1/ai/drafts', {
        method: 'POST',
        body: JSON.stringify({ message: msgText }),
      });

      setDraft(res);
      // Initialize editable confirmed lines from draft
      const lines = (res.lines || []).map((l: any) => ({
        skuCode: l.matchedSkuCode,
        cases: l.quantity,
        unit: l.unit,
      }));
      setConfirmedLines(lines);
    } catch (err: any) {
      setError(err.message || 'Failed to process AI order draft');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateLineQty = (skuCode: string, newQty: number) => {
    setConfirmedLines((prev) =>
      prev.map((line) => (line.skuCode === skuCode ? { ...line, cases: newQty } : line))
    );
  };

  const handleSwitchSku = (oldSkuCode: string, newSkuCode: string) => {
    setConfirmedLines((prev) =>
      prev.map((line) => (line.skuCode === oldSkuCode ? { ...line, skuCode: newSkuCode } : line))
    );
  };

  const handleConfirmUnit = (skuCode: string, unit: 'case' | 'piece') => {
    setConfirmedLines((prev) =>
      prev.map((line) => (line.skuCode === skuCode ? { ...line, unit } : line))
    );
  };

  const handleConfirmOrder = async () => {
    if (!draft) return;
    setIsProcessing(true);
    try {
      const res = await apiRequest<any>(`/api/v1/ai/drafts/${draft.id}/confirm`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': `CONFIRM_DRAFT_${draft.id}_${Date.now()}`,
        },
        body: JSON.stringify({
          lines: confirmedLines.map((l) => ({ skuCode: l.skuCode, cases: l.cases })),
          paymentMode: 'credit_account',
        }),
      });

      navigate('/orders');
    } catch (err: any) {
      setError(err.message || 'Failed to confirm AI order draft');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Header */}
      <div className="bg-bg-surface p-5 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-text-main">{t.aiOrderCapture}</h1>
          </div>
          <MockBadge label="AI DRAFT ONLY" />
        </div>
        <p className="text-xs text-text-muted">{t.aiSubtitle}</p>

        {/* Message Input Form */}
        <div className="mt-4 space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.messagePlaceholder}
            rows={3}
            className="w-full p-3.5 rounded-xl border border-border bg-bg-base text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-accent/40"
          />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setMessage(DEMO_MESSAGE);
                handleProcessMessage(DEMO_MESSAGE);
              }}
              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1.5 self-start"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Fill with Official Demo Message (Spec 5.6)</span>
            </button>

            <Button
              onClick={() => handleProcessMessage(message)}
              variant="primary"
              size="md"
              isLoading={isProcessing}
              disabled={!message.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span>{t.generateDraft}</span>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-status-error font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Draft Review Screen (Spec 5.2 & 10.5) */}
      {draft && (
        <div className="bg-bg-surface p-5 rounded-2xl border border-border shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-text-main">{t.draftReviewTitle}</h2>
              <span className="text-xs text-text-muted">
                Human confirmation mandatory before placement
              </span>
            </div>
            <span className="text-xs font-mono bg-bg-subtle px-2 py-1 rounded">
              Draft #{draft.id.slice(0, 8)}
            </span>
          </div>

          {/* Original Shop Message Banner */}
          <div className="p-3.5 rounded-xl bg-bg-subtle border border-border text-xs">
            <div className="font-bold text-text-muted uppercase text-[10px] tracking-wider mb-1">
              {t.originalMessage}
            </div>
            <div className="font-medium text-text-main italic">
              "{draft.rawMessage}"
            </div>
          </div>

          {/* Parsed Lines List */}
          <div className="space-y-3">
            {(draft.lines || []).map((line: any, idx: number) => {
              const currentLine = confirmedLines.find((c) => c.skuCode === line.matchedSkuCode);
              const qty = currentLine?.cases ?? line.quantity;
              const unit = currentLine?.unit ?? line.unit;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border bg-bg-surface shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-accent font-mono">
                          {line.matchedSkuCode}
                        </span>
                        <ConfidenceBadge confidence={line.confidence} />
                        <StockBadge band={line.stockBand} />
                      </div>
                      <h4 className="text-sm font-bold text-text-main mt-1">
                        {line.skuName}
                      </h4>
                      <p className="text-xs text-text-muted">
                        Extracted from phrase: <span className="font-semibold italic">"{line.originalPhrase}"</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-text-muted font-medium">Dealer Price</div>
                      <Money paise={line.unitPricePaise} className="text-base text-text-main" />
                    </div>
                  </div>

                  {/* Clarification Question Card for Unclear Units (Spec 5.2 Step 8) */}
                  {line.confidence === 'needs_clarification' && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
                      <div className="font-bold flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-amber-700" />
                        <span>Question: {line.clarificationQuestion}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmUnit(line.matchedSkuCode, 'case')}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            unit === 'case'
                              ? 'bg-amber-600 text-white border-amber-700'
                              : 'bg-white text-stone-800 border-amber-300'
                          }`}
                        >
                          {t.casesOption}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmUnit(line.matchedSkuCode, 'piece')}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                            unit === 'piece'
                              ? 'bg-amber-600 text-white border-amber-700'
                              : 'bg-white text-stone-800 border-amber-300'
                          }`}
                        >
                          {t.piecesOption}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Alternatives (Spec 5.2 Step 7) */}
                  {line.alternatives && line.alternatives.length > 0 && (
                    <div className="text-xs text-text-muted flex items-center gap-2">
                      <span>Alternative products:</span>
                      {line.alternatives.map((alt: any) => (
                        <button
                          key={alt.skuCode}
                          type="button"
                          onClick={() => handleSwitchSku(line.matchedSkuCode, alt.skuCode)}
                          className="px-2 py-0.5 rounded bg-bg-subtle hover:bg-border border border-border text-[11px] font-medium text-text-main"
                        >
                          Switch to {alt.skuCode}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Stepper Quantity Control */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs font-medium text-text-muted">
                      Confirmed Quantity ({unit}):
                    </span>
                    <Stepper
                      value={qty}
                      onChange={(newVal) => handleUpdateLineQty(line.matchedSkuCode, newVal)}
                      min={1}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons: Confirm or Manual Fallback */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border">
            <Button
              onClick={() => navigate('/catalogue')}
              variant="outline"
              size="md"
            >
              {t.manualFallback}
            </Button>

            <Button
              onClick={handleConfirmOrder}
              variant="primary"
              size="lg"
              isLoading={isProcessing}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span>{t.confirmAiDraft}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
