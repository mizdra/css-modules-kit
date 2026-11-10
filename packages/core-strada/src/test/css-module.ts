import { readFileSync } from 'node:fs';
import { type CSSModule, parseCSSModule } from '@css-modules-kit/core';

export function readAndParseCSSModule(
  path: string,
  options?: { animation?: boolean; dashedIdents?: boolean; container?: boolean; namedExports?: boolean },
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
    container: options?.container ?? false,
    namedExports: options?.namedExports ?? false,
  });
}
