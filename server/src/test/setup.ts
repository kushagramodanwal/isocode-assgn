// Integration tests talk to TEST_DATABASE_URL, never the dev database.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.SESSION_SECRET ??= "test-only-secret-test-only-secret-test-only";
// Tests never call a live AI service, even when a key is in .env: it is slow, rate-limited and
// not deterministic. The Gemini adapter has its own tests with a mocked SDK (llm.test.ts).
process.env.LLM_PROVIDER = "none";
delete process.env.GEMINI_API_KEY;
