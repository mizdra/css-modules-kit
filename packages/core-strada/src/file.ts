import { CSS_MODULE_EXTENSION, type MatchesPattern } from '@css-modules-kit/core';
import ts from 'typescript';
import { join, parse } from './path.js';

export function getCssModuleFileName(tsFileName: string): string {
  const { dir, name } = parse(tsFileName);
  return join(dir, `${name}${CSS_MODULE_EXTENSION}`);
}

/**
 * Create a function that checks whether the given file name matches the pattern.
 * This does not access the file system.
 * @param options
 * @returns
 */
export function createMatchesPattern(options: { includes: string[]; excludes: string[] }): MatchesPattern {
  // Setup utilities to check for pattern matches without accessing the file system
  const realpath = (path: string) => path;
  const getFileSystemEntries = (path: string): ts.FileSystemEntries => {
    return {
      files: [path],
      directories: [],
    };
  };

  return (fileName: string) => {
    const matchedFileNames = ts.matchFiles(
      fileName,
      [CSS_MODULE_EXTENSION],
      options.excludes,
      options.includes,
      ts.sys.useCaseSensitiveFileNames,
      '', // `fileName`, `includes`, and `excludes` are absolute paths, so `currentDirectory` is not needed.
      undefined,
      getFileSystemEntries,
      realpath,
    );
    return matchedFileNames.length > 0;
  };
}

/**
 * Get files matched by the pattern.
 */
export function getFileNamesByPattern(options: { basePath: string; includes: string[]; excludes: string[] }): string[] {
  // ref: https://github.com/microsoft/TypeScript/blob/caf1aee269d1660b4d2a8b555c2d602c97cb28d7/src/compiler/commandLineParser.ts#L3929

  // MEMO: `ts.sys.readDirectory` catch errors internally. So we don't need to wrap with try-catch.
  // https://github.com/microsoft/TypeScript/blob/caf1aee269d1660b4d2a8b555c2d602c97cb28d7/src/compiler/sys.ts#L1877-L1879

  return ts.sys.readDirectory(options.basePath, [CSS_MODULE_EXTENSION], options.excludes, options.includes);
}
