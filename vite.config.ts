// oxlint-disable-next-line no-restricted-imports
import { resolve } from 'node:path';
import mizdraOxfmtConfig from '@mizdra/oxfmt-config';
import mizdraOxlintConfig from '@mizdra/oxlint-config';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    extends: [mizdraOxlintConfig.base, mizdraOxlintConfig.typescript, mizdraOxlintConfig.node],
    ignorePatterns: ['**/dist', 'examples', 'crates', 'target', '.vscode-test'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'Buffer',
          message: 'Use Uint8Array instead.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'buffer',
              message: 'Use Uint8Array instead.',
            },
            {
              name: 'node:buffer',
              message: 'Use Uint8Array instead.',
            },
            {
              name: 'node:path',
              message: 'Use original path package instead.',
            },
          ],
          patterns: [
            {
              group: ['**/src', '!**/../src'],
              message: 'Do not import internal modules directly.',
            },
          ],
        },
      ],
    },
    options: { typeAware: true, typeCheck: true },
  },
  fmt: {
    ...mizdraOxfmtConfig,
    ignorePatterns: [
      'examples/*/generated',
      'examples/*/src',
      'docs/ts-plugin-internals.md',
      'docs/ts-plugin-internals.ja.md',
    ],
  },
  test: {
    // On GitHub Actions, the Windows runner is slow and tests may fail with the default timeout.
    // Therefore, we set the timeout to 10 seconds.
    testTimeout: 10_000,
    watch: false,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['packages/*/src/**/*.test.ts'],
        },
        resolve: {
          alias: {
            '@css-modules-kit/core': resolve('packages/core/src/index.ts'),
            ...(process.env['STYLELINT_VERSION'] ? { stylelint: `stylelint-${process.env['STYLELINT_VERSION']}` } : {}),
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['packages/*/e2e-test/**/*.test.ts'],
          globalSetup: ['./scripts/vitest-e2e-test-setup.ts'],
        },
      },
    ],
  },
});
