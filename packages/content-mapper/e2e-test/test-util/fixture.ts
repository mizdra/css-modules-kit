import { randomUUID } from 'node:crypto';
import { mkdirSync, realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from '@css-modules-kit/core';
import { type CreateIFFResult, defineIFFCreator } from '@mizdra/inline-fixture-files';
import type { Position, Range } from './lsp-client.js';

// tmpdir() may be a symlink (e.g. /var -> /private/var on macOS). The file URIs sent by the LSP
// client must match the ones the server reports back, so the real path is resolved up front.
export const fixtureDir = join(
  realpathSync(tmpdir()),
  '@css-modules-kit/content-mapper',
  process.env['VITEST_POOL_ID']!,
);
mkdirSync(fixtureDir, { recursive: true });

const createIFF = defineIFFCreator({
  generateRootDir: () => join(fixtureDir, randomUUID()),
  unixStylePath: true,
});

const contentMapperDir = resolve(import.meta.dirname, '../..');

function findAllMatches(content: string, search: string): number[] {
  if (search.length === 0) throw new Error('Empty search string is not allowed.');
  const matches: number[] = [];
  let pos = content.indexOf(search);
  while (pos !== -1) {
    matches.push(pos);
    pos = content.indexOf(search, pos + 1);
  }
  return matches;
}

function offsetToPosition(content: string, offset: number): Position {
  const before = content.slice(0, offset);
  const newlineCount = (before.match(/\n/gu) ?? []).length;
  const lastNewline = before.lastIndexOf('\n');
  return {
    line: newlineCount,
    character: before.length - (lastNewline + 1),
  };
}

type Files = Record<string, string>;

export interface SetupFixtureResult<T extends Files> {
  iff: CreateIFFResult<T>;
  /**
   * Get the (0-based) line/character position of the first character of `search` in `file`,
   * matching the LSP convention.
   *
   * - If `search` matches exactly once, returns that position.
   * - If `search` matches multiple times, an `index` (0-based) must be passed.
   * - Throws if `search` does not match, or `index` is out of range.
   */
  getPosition: (file: string, search: string, index?: number) => Position;
  /**
   * Get the (0-based) start/end range of `search` in `file`.
   *
   * - `start` is identical to `getPosition(file, search, index)`.
   * - `end` points to the position immediately AFTER the last character of `search`
   *   (exclusive end, matching the LSP convention).
   * - Same matching/error semantics as `getPosition`.
   */
  getRange: (file: string, search: string, index?: number) => Range;
}

export async function setupFixture<const T extends Files>(files: T): Promise<SetupFixtureResult<T>> {
  // oxlint-disable-next-line typescript/no-explicit-any
  const iff = (await createIFF(files)) as any;

  // tsgo resolves the mapper package from the tsconfig directory with node module resolution.
  mkdirSync(join(iff.rootDir, 'node_modules/@css-modules-kit'), { recursive: true });
  symlinkSync(contentMapperDir, join(iff.rootDir, 'node_modules/@css-modules-kit/content-mapper'), 'junction');

  function getPosition(file: string, search: string, index?: number): Position {
    const content = files[file];
    if (content === undefined) {
      throw new Error(`File "${file}" was not registered in the fixture.`);
    }
    const matches = findAllMatches(content, search);
    if (matches.length === 0) {
      throw new Error(`Substring ${JSON.stringify(search)} not found in "${file}".`);
    }
    if (matches.length > 1 && index === undefined) {
      throw new Error(
        `Substring ${JSON.stringify(search)} matches ${matches.length} times in "${file}". ` +
          `Pass a 0-based index as the third argument to disambiguate.`,
      );
    }
    const target = matches[index ?? 0];
    if (target === undefined) {
      throw new Error(
        `Index ${index} is out of bounds (only ${matches.length} matches of ${JSON.stringify(search)} in "${file}").`,
      );
    }
    return offsetToPosition(content, target);
  }

  function getRange(file: string, search: string, index?: number): Range {
    const start = getPosition(file, search, index);
    const lines = search.split('\n');
    if (lines.length === 1) {
      return { start, end: { line: start.line, character: start.character + search.length } };
    }
    const lastLine = lines[lines.length - 1] ?? '';
    return {
      start,
      end: {
        line: start.line + lines.length - 1,
        character: lastLine.length,
      },
    };
  }

  return { iff, getPosition, getRange };
}
