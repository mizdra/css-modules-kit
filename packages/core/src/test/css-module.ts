import type { CSSModule } from '../parser/css-module-parser.js';

export function createCSSModule(args?: Partial<CSSModule>): CSSModule {
  return {
    fileName: '/test.module.css',
    localTokens: [],
    tokenImporters: [],
    ...args,
  };
}
