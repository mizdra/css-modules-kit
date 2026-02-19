import cssModulesKit from '@css-modules-kit/eslint-plugin';
import css from '@eslint/css';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.css'],
    language: 'css/css',
    languageOptions: {
      tolerant: true,
    },
    extends: [css.configs.recommended, cssModulesKit.configs.recommended],
  },
]);
