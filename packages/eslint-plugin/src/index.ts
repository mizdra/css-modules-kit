import type { ESLint } from 'eslint';
import packageJson from '../package.json';
import { noMissingComponentFile } from './rules/no-missing-component-file.js';
import { noUnusedClassNames } from './rules/no-unused-class-names.js';

const plugin = {
  meta: {
    name: packageJson.name,
    version: packageJson.version,
  },
  rules: {
    'no-missing-component-file': noMissingComponentFile,
    'no-unused-class-names': noUnusedClassNames,
  },
  configs: {
    recommended: {
      languageOptions: {
        customSyntax: {
          atrules: {
            value: {
              // Example:
              // - `@value a: #123;`
              // - `@value empty:;`
              // - `@value withoutSemicolon #123;`
              // - `@value a from './test.module.css';`
              // - `@value a, b from './test.module.css';`
              // - `@value a as aliased_a from './test.module.css';`
              //
              // CSS Modules Kit does not support the following for implementation simplicity:
              // - `@value (a, b) from '...';`
              // - `@value a from moduleName;`
              //
              // ref: https://github.com/css-modules/postcss-icss-values/blob/acdf34a62cc2537a9507b1e9fd34db486e5cb0f8/test/test.js
              prelude:
                '<custom-ident> :? <declaration-value>? | [ [ <custom-ident> [ as <custom-ident> ]? ]# from <string> ]',
            },
          },
          properties: {
            // Example:
            // - `composes: a;`
            // - `composes: a from './test.module.css';`
            // - `composes: a, b from './test.module.css';`
            // - `composes: a b from './test.module.css';`
            // - `composes: global(a) from './test.module.css';`
            //
            // ref: https://github.com/css-modules/postcss-modules-extract-imports/blob/16f9c570e517cf3558b88cf96dcadf794230965a/src/index.js
            composes: '[ [ <custom-ident> | global(<custom-ident>) ] ]# [ from <string> ]?',
          },
        },
      },
      plugins: {
        'css-modules-kit': {},
      },
      rules: {
        'css-modules-kit/no-missing-component-file': 'error',
        'css-modules-kit/no-unused-class-names': 'error',
      },
    },
  },
} satisfies ESLint.Plugin;
plugin.configs.recommended.plugins['css-modules-kit'] = plugin;

export = plugin;
