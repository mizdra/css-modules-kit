import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from '@css-modules-kit/core';
import { type CreateIFFResult, defineIFFCreator } from '@mizdra/inline-fixture-files';

const fixtureDir = join(tmpdir(), '@css-modules-kit/ts-plugin', process.env['VITEST_POOL_ID']!);
export const createIFF = defineIFFCreator({
  generateRootDir: () => join(fixtureDir, randomUUID()),
  unixStylePath: true,
});

export type Loc = { line: number; offset: number };

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

function offsetToLoc(content: string, offset: number): Loc {
  const before = content.slice(0, offset);
  const newlineCount = (before.match(/\n/g) ?? []).length;
  const lastNewline = before.lastIndexOf('\n');
  return {
    line: newlineCount + 1,
    offset: before.length - (lastNewline + 1) + 1,
  };
}

type Files = Record<string, string>;

export interface SetupFixtureResult<T extends Files> {
  iff: CreateIFFResult<T>;
  /**
   * Get the (1-based) line/offset of the first character of `search` in `file`.
   *
   * - If `search` matches exactly once, returns that position.
   * - If `search` matches multiple times, an `index` (0-based) must be passed.
   * - Throws if `search` does not match, or `index` is out of range.
   */
  getLoc: (file: string, search: string, index?: number) => Loc;
  /**
   * Get the (1-based) start/end range of `search` in `file`.
   *
   * - `start` is identical to `getLoc(file, search, index)`.
   * - `end` points to the position immediately AFTER the last character of `search`
   *   (exclusive end, matching tsserver's convention).
   * - Same matching/error semantics as `getLoc`.
   */
  getRange: (file: string, search: string, index?: number) => { start: Loc; end: Loc };
}

export async function setupFixture<const T extends Files>(files: T): Promise<SetupFixtureResult<T>> {
  // oxlint-disable-next-line typescript/no-explicit-any
  const iff = (await createIFF(files)) as any;

  function getLoc(file: string, search: string, index?: number): Loc {
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
    return offsetToLoc(content, target);
  }

  function getRange(file: string, search: string, index?: number): { start: Loc; end: Loc } {
    const start = getLoc(file, search, index);
    const lines = search.split('\n');
    if (lines.length === 1) {
      return { start, end: { line: start.line, offset: start.offset + search.length } };
    }
    const lastLine = lines[lines.length - 1] ?? '';
    return {
      start,
      end: {
        line: start.line + lines.length - 1,
        offset: lastLine.length + 1,
      },
    };
  }

  return { iff, getLoc, getRange };
}
