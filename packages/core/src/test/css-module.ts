import type { CSSModule } from '../parser/css-module-parser.js';

export function fakeCSSModule(args?: Partial<CSSModule>): CSSModule {
  return {
    fileName: '/test.module.css',
    text: '',
    localTokens: [],
    tokenImporters: [],
    ...args,
  };
}
