process.env.SESSION_SECRET ??= 'test-secret-test-secret-test-secret-123';
process.env.DEMO_MODE ??= 'true';
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
