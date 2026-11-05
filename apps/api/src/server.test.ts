import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './server.js';

describe('API Integration & Security Tests', () => {
  it('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/v1/auth/otp/request succeeds and returns masked phone', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ phone: '+910000000001' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.maskedPhone).toBe('••••0001');
  });

  it('POST /api/v1/auth/otp/verify rejects invalid code', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: '+910000000001', code: '999999' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/skus rejects unauthenticated request (401)', async () => {
    const res = await request(app).get('/api/v1/skus');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/desk/orders rejects unauthenticated request (401)', async () => {
    const res = await request(app).get('/api/v1/desk/orders');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });
});
