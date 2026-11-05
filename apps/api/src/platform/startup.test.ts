import { describe, expect, it } from 'vitest';
import '../server.js';
import { declaredRouteRoles } from '../middleware/requireRole.js';
import { loadConfig } from './config.js';

describe('Startup Guards and Route Security (Spec 8 & 11)', () => {
  it('prevents starting in production if DEV_OTP_ENABLED is true', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        DEV_OTP_ENABLED: 'true',
        SESSION_SECRET: 'super-secret-fmcg-retailer-session-key-32chars-min',
        DATABASE_URL: 'postgresql://localhost:5432/db',
      })
    ).toThrow(/SECURITY VIOLATION: DEV_OTP_ENABLED cannot be true in production/);
  });

  it('allows starting in production if DEV_OTP_ENABLED is false', () => {
    const cfg = loadConfig({
      NODE_ENV: 'production',
      DEV_OTP_ENABLED: 'false',
      SESSION_SECRET: 'super-secret-fmcg-retailer-session-key-32chars-min',
      DATABASE_URL: 'postgresql://localhost:5432/db',
    });
    expect(cfg.DEV_OTP_ENABLED).toBe(false);
  });

  it('allows starting in development with DEV_OTP_ENABLED true', () => {
    const cfg = loadConfig({
      NODE_ENV: 'development',
      DEV_OTP_ENABLED: 'true',
      SESSION_SECRET: 'super-secret-fmcg-retailer-session-key-32chars-min',
      DATABASE_URL: 'postgresql://localhost:5432/db',
    });
    expect(cfg.DEV_OTP_ENABLED).toBe(true);
  });

  it('enforces default-deny role declarations across all registered API routes', () => {
    expect(declaredRouteRoles.size).toBeGreaterThan(10);
    for (const [route, roles] of declaredRouteRoles.entries()) {
      expect(roles.length, `Route ${route} must declare allowed roles`).toBeGreaterThan(0);
      for (const r of roles) {
        expect(['retailer', 'desk']).toContain(r);
      }
    }
  });
});
