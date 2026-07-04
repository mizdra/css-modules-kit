import { readFileSync } from 'node:fs';
import { parseCSSModule } from '../parser/css-module-parser.js';
import type { CSSModule } from '../type.js';

export function fakeCSSModule(args?: Partial<CSSModule>): CSSModule {
  return {
    fileName: '/test.module.css',
    text: '',
    localTokens: [],
    tokenImporters: [],
    tokenReferences: [],
    diagnostics: [],
    ...args,
  };
}

export function readAndParseCSSModule(
  path: string,
  options?: { animation?: boolean; dashedIdents?: boolean },
): CSSModule | undefined {
  let text: string;
  try {
    text = readFileSync(path, 'utf-8');
  } catch {
    return undefined;
  }
  return parseCSSModule(text, {
    fileName: path,
    includeSyntaxError: false,
    animation: options?.animation ?? true,
    dashedIdents: options?.dashedIdents ?? false,
  });
}
