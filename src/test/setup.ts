// Integration tests talk to TEST_DATABASE_URL, never the dev database.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.SESSION_SECRET ??= "test-only-secret-test-only-secret-test-only";
process.env.LLM_PROVIDER ??= "none";
