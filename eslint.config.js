import mizdra from '@mizdra/eslint-config-mizdra';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['**/dist', 'examples'] },
  ...mizdra.baseConfigs,
  ...mizdra.typescriptConfigs,
  ...mizdra.nodeConfigs,
  {
    files: ['**/*.{js,jsx,mjs,cjs}', '**/*.{ts,tsx,cts,mts}'],
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          // Remove blank lines between import groups
          // ref: https://github.com/lydell/eslint-plugin-simple-import-sort?tab=readme-ov-file#how-do-i-use-this-with-dprint
          groups: [['^\\u0000', '^node:', '^@?\\w', '^', '^\\.']],
        },
      ],
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
      // Disable because it does not work in the workspace
      // ref: https://github.com/eslint-community/eslint-plugin-n/issues/209
      'n/no-extraneous-import': 'off',
    },
  },
  mizdra.prettierConfig,
];
