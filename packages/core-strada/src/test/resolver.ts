import { existsSync } from 'node:fs';
// oxlint-disable-next-line no-restricted-imports
import { dirname, resolve } from 'node:path';
import type { Resolver } from '../type.js';

/** Resolves relative specifiers to existing files. Other specifiers are not resolved. */
export const fakeResolver: Resolver = (specifier, options) => {
  if (!specifier.startsWith('.')) return undefined;
  const fileName = resolve(dirname(options.request), specifier).replaceAll('\\', '/');
  return existsSync(fileName) ? fileName : undefined;
};
