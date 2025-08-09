// eslint-disable-next-line no-restricted-imports
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
          include: ['packages/*/e2e/**/*.test.ts'],
          exclude: ['packages/vscode/e2e/**'],
          globalSetup: ['./scripts/vitest-post-build-setup.ts'],
        },
      },
    ],
  },
});
