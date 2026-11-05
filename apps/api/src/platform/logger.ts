/**
 * Structured logger with redaction for sensitive fields (Rule 10).
 * Never logs OTP values, full phone numbers, session tokens, or API keys.
 */

function redact(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('otp') ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('key')
    ) {
      redacted[key] = '[REDACTED]';
    } else if (lowerKey.includes('phone') && typeof value === 'string') {
      redacted[key] = value.length > 4 ? `••••${value.slice(-4)}` : '••••';
    } else if (typeof value === 'object') {
      redacted[key] = redact(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        ...(context ? redact(context) : {}),
      })
    );
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        ...(context ? redact(context) : {}),
      })
    );
  },
  error: (message: string, context?: Record<string, any>) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message,
        ...(context ? redact(context) : {}),
      })
    );
  },
};
