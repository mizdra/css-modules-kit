// eslint-disable-next-line no-restricted-imports
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // On GitHub Actions, the Windows runner is slow and tests may fail with the default timeout.
    // Therefore, we set the timeout to 10 seconds.
    testTimeout: 10_000,
    projects: [
      {
        test: {
          name: 'unit',
          include: ['packages/*/src/**/*.test.ts'],
        },
        resolve: {
          alias: {
            '@css-modules-kit/core': resolve('packages/core/src/index.ts'),
          },
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['packages/*/e2e-test/**/*.test.ts'],
          globalSetup: ['./scripts/vitest-e2e-test-setup.ts'],
        },
      },
    ],
  },
});
