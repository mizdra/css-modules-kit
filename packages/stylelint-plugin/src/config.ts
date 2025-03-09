import type { Config } from 'stylelint';

const config: Config = {
  plugins: ['@css-modules-kit/stylelint-plugin'],
  languageOptions: {
    syntax: {
      atRules: {
        value: {
          comment: 'Define values with CSS Modules',
        },
      },
      properties: {
        composes: '[ <custom-ident> , ]* <custom-ident> [ from <string> ]',
      },
    },
  },
  rules: {
    'css-modules-kit/no-unused-class-names': true,
    'css-modules-kit/no-missing-component-file': true,
  },
};

export = config;
