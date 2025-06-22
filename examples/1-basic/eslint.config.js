import { defineConfig } from 'eslint/config';
import css from '@eslint/css';
import cssModulesKit from '@css-modules-kit/eslint-plugin';

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
