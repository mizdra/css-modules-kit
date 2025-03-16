import type { CSSModule } from '../type.js';

export function fakeCSSModule(args?: Partial<CSSModule>): CSSModule {
  return {
    fileName: '/test.module.css',
    text: '',
    localTokens: [],
    tokenImporters: [],
    ...args,
  };
}
