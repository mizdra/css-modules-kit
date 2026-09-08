import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from '@css-modules-kit/core';
import { type CreateIFFResult, defineIFFCreator } from '@mizdra/inline-fixture-files';
import { type FileSpan, type FileSpanWithContext, formatPath } from './tsserver.js';

const fixtureDir = join(tmpdir(), '@css-modules-kit/ts-plugin', process.env['VITEST_POOL_ID']!);
export const createIFF = defineIFFCreator({
  generateRootDir: () => join(fixtureDir, randomUUID()),
  unixStylePath: true,
});

export type Loc = { line: number; offset: number };
export type FileLocation = { file: string; line: number; offset: number };

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
  const newlineCount = (before.match(/\n/gu) ?? []).length;
  const lastNewline = before.lastIndexOf('\n');
  return {
    line: newlineCount + 1,
    offset: before.length - (lastNewline + 1) + 1,
  };
}

type Files = Record<string, string>;

export interface GetFileSpanOptions {
  /** 0-based index of the match when `search` matches multiple times. */
  index?: number;
  /**
   * A substring enclosing the `search` match. When given, the returned span also carries
   * `contextStart` / `contextEnd` pointing to the occurrence of `context` that encloses the match.
   */
  context?: string;
}

export interface SetupFixtureResult<T extends Files> {
  iff: CreateIFFResult<T>;
  /**
   * Get the absolute path of `file` and the (1-based) line/offset of the first character of `search` in it.
   * The result can be passed directly as tsserver request arguments.
   *
   * - If `search` matches exactly once, returns that position.
   * - If `search` matches multiple times, an `index` (0-based) must be passed.
   * - Throws if `search` does not match, or `index` is out of range.
   */
  getFileLocation: (file: string, search: string, index?: number) => FileLocation;
  /**
   * Get the absolute (path-normalized) path of `file` and the (1-based) start/end range of `search` in it.
   * The result can be compared directly with spans returned by the tsserver client.
   *
   * - `start` is identical to the position returned by `getFileLocation`.
   * - `end` points to the position immediately AFTER the last character of `search`
   *   (exclusive end, matching tsserver's convention).
   * - Same matching/error semantics as `getFileLocation`.
   */
  getFileSpan: (file: string, search: string, options?: GetFileSpanOptions) => FileSpanWithContext;
}

export async function setupFixture<const T extends Files>(files: T): Promise<SetupFixtureResult<T>> {
  // oxlint-disable-next-line typescript/no-explicit-any
  const iff = (await createIFF(files)) as any;

  function getFileContent(file: string): string {
    const content = files[file];
    if (content === undefined) {
      throw new Error(`File "${file}" was not registered in the fixture.`);
    }
    return content;
  }

  function findOffset(file: string, search: string, index?: number): number {
    const content = getFileContent(file);
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
    return target;
  }

  function findEnclosingContextOffset(file: string, context: string, start: number, end: number): number {
    const content = getFileContent(file);
    const enclosing = findAllMatches(content, context).find(
      (offset) => offset <= start && end <= offset + context.length,
    );
    if (enclosing === undefined) {
      throw new Error(`No occurrence of context ${JSON.stringify(context)} encloses the match in "${file}".`);
    }
    return enclosing;
  }

  function getFileLocation(file: string, search: string, index?: number): FileLocation {
    return { file: iff.paths[file], ...offsetToLoc(getFileContent(file), findOffset(file, search, index)) };
  }

  function getFileSpan(file: string, search: string, options?: GetFileSpanOptions): FileSpanWithContext {
    const content = getFileContent(file);
    const start = findOffset(file, search, options?.index);
    const end = start + search.length;
    const span: FileSpan = {
      file: formatPath(iff.paths[file]),
      start: offsetToLoc(content, start),
      end: offsetToLoc(content, end),
    };
    if (options?.context === undefined) return span;
    const contextStart = findEnclosingContextOffset(file, options.context, start, end);
    return {
      ...span,
      contextStart: offsetToLoc(content, contextStart),
      contextEnd: offsetToLoc(content, contextStart + options.context.length),
    };
  }

  return { iff, getFileLocation, getFileSpan };
}
