import ts from 'typescript';
import { join, parse } from './path.js';
import type { MatchesPattern } from './type.js';

export const CSS_MODULE_EXTENSION = '.module.css';
const COMPONENT_EXTENSIONS = ['.tsx', '.jsx'];

export function isCSSModuleFile(fileName: string): boolean {
  return fileName.endsWith(CSS_MODULE_EXTENSION);
}

export function getCssModuleFileName(tsFileName: string): string {
  const { dir, name } = parse(tsFileName);
  return join(dir, `${name}${CSS_MODULE_EXTENSION}`);
}

export function isComponentFileName(fileName: string): boolean {
  // NOTE: Do not check whether it is an upper camel case or not, since lower camel case (e.g. `page.tsx`) is used in Next.js.
  return COMPONENT_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

export async function findComponentFile(
  cssModuleFileName: string,
  readFile: (path: string) => Promise<string>,
): Promise<{ fileName: string; text: string } | undefined> {
  const pathWithoutExtension = cssModuleFileName.slice(0, -CSS_MODULE_EXTENSION.length);
  for (const path of COMPONENT_EXTENSIONS.map((ext) => pathWithoutExtension + ext)) {
    try {
      // TODO: Cache the result of readFile
      // eslint-disable-next-line no-await-in-loop
      const text = await readFile(path);
      return { fileName: path, text };
    } catch {
      continue;
    }
  }
  return undefined;
}

export function findComponentFileSync(
  cssModuleFileName: string,
  readFileSync: (path: string) => string,
): { fileName: string; text: string } | undefined {
  const pathWithoutExtension = cssModuleFileName.slice(0, -CSS_MODULE_EXTENSION.length);
  for (const path of COMPONENT_EXTENSIONS.map((ext) => pathWithoutExtension + ext)) {
    try {
      // TODO: Cache the result of readFile
      const text = readFileSync(path);
      return { fileName: path, text };
    } catch {
      continue;
    }
  }
  return undefined;
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
