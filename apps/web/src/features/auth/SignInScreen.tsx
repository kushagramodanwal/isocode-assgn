import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldCheck, Store } from 'lucide-react';
import { Button } from '../../components/Button';
import { useI18n } from '../../i18n';
import { useAuth } from './AuthContext';

export function SignInScreen() {
  const { t } = useI18n();
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('+910000000001');
  const [code, setCode] = useState('123456');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await requestOtp(phone);
      setMaskedPhone(res.maskedPhone);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const user = await verifyOtp(phone, code);
      if (user.role === 'desk') {
        navigate('/desk');
      } else {
        navigate('/catalogue');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-bg-base">
      <div className="w-full max-w-md bg-bg-surface border border-border rounded-2xl shadow-sm p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3 text-accent">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-text-main">{t.appTitle}</h1>
          <p className="text-xs text-text-muted mt-1">{t.jabalpurDistributor}</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-status-error font-medium">
            {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-main mb-1.5">
                {t.enterPhone}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                required
                className="w-full px-4 py-3 rounded-lg border border-border bg-bg-surface text-base text-text-main focus:outline-none focus:ring-2 focus:ring-accent/40 touch-target"
              />
            </div>

            <div className="p-3 rounded-lg bg-bg-subtle border border-border/80 text-xs space-y-1.5 text-text-muted">
              <div className="font-semibold text-text-main flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Demo Accounts</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border/50">
                <span>Ramesh Kirana (Retailer):</span>
                <button
                  type="button"
                  onClick={() => setPhone('+910000000001')}
                  className="text-accent font-mono font-medium hover:underline"
                >
                  +910000000001
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span>Distributor Desk Lead:</span>
                <button
                  type="button"
                  onClick={() => setPhone('+910000000099')}
                  className="text-accent font-mono font-medium hover:underline"
                >
                  +910000000099
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              <span>{t.sendOtp}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-status-success" />
              <span>
                {t.codeSentTo} <strong className="font-mono">{maskedPhone}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-main mb-1.5">
                {t.enterOtp}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                required
                className="w-full px-4 py-3 text-center tracking-widest font-mono text-xl font-bold rounded-lg border border-border bg-bg-surface text-text-main focus:outline-none focus:ring-2 focus:ring-accent/40 touch-target"
              />
              <p className="text-[11px] text-accent font-medium mt-1.5 text-center">
                {t.demoOtpNotice}
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              {t.verifyOtp}
            </Button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-xs text-text-muted hover:text-text-main py-2"
            >
              {t.changePhone}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
