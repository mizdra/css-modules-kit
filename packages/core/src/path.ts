// eslint-disable-next-line no-restricted-imports
import type { ParsedPath } from 'node:path';
// eslint-disable-next-line no-restricted-imports
import nodePath from 'node:path';
import ts from 'typescript';

export function slash(path: string): string {
  return ts.server.toNormalizedPath(path);
}

export function join(...paths: string[]): string {
  return slash(nodePath.join(...paths));
}

export function resolve(...paths: string[]): string {
  return slash(nodePath.resolve(...paths));
}

export function relative(from: string, to: string): string {
  return slash(nodePath.relative(from, to));
}

export function dirname(path: string): string {
  return slash(nodePath.dirname(path));
}

export function basename(path: string): string {
  return slash(nodePath.basename(path));
}

export function parse(path: string): ParsedPath {
  const { root, dir, base, name, ext } = nodePath.parse(path);
  return { root: slash(root), dir: slash(dir), base, name, ext };
}

// eslint-disable-next-line @typescript-eslint/unbound-method
export const isAbsolute = nodePath.isAbsolute;
