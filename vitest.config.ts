import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['src/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    environment: 'node',
    // Integration tests share one test database; run files serially.
    fileParallelism: false,
    setupFiles: ['tests/setup.ts'],
  },
});
