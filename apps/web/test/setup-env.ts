// The app reads its settings through env(); tests that exercise it without mocking it get these. Real values are never used.
process.env.UPSTASH_REDIS_REST_URL ??= "https://test.upstash.invalid";
process.env.UPSTASH_REDIS_REST_TOKEN ??= "test-token";
process.env.AUTH_SECRET ??= "x".repeat(32);
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
