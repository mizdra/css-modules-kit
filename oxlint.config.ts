import mizdra from '@mizdra/oxlint-config';
import { defineConfig } from 'oxlint';

export default defineConfig({
  extends: [mizdra.base, mizdra.typescript, mizdra.node],
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
});
