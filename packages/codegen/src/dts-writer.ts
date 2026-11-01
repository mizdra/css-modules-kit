import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, parse, relative, resolve } from '@css-modules-kit/core-strada';
import { WriteDtsFileError } from './error.js';

/**
 * Get .d.ts file path.
 * @param cssModuleFileName The path to the CSS Module file (i.e. `/src/foo.module.css`). It is absolute.
 * @param options Output directory options
 * @returns The path to the .d.ts file. It is absolute.
 */
export function getDtsFilePath(cssModuleFileName: string, options: WriteDtsFileOption): string {
  const relativePath = relative(options.basePath, cssModuleFileName);
  const outputFilePath = resolve(options.outDir, relativePath);

  if (options.arbitraryExtensions) {
    const { dir, name, ext } = parse(outputFilePath);
    return join(dir, `${name}.d${ext}.ts`);
  } else {
    return `${outputFilePath}.d.ts`;
  }
}

export interface WriteDtsFileOption {
  /** Directory to write the d.ts file. This is an absolute path. */
  outDir: string;
  basePath: string;
  /** Generate `.d.css.ts` instead of `.css.d.ts`. */
  arbitraryExtensions: boolean;
}

/**
 * Write a d.ts file to the file system.
 * @param text The d.ts text to write.
 * @param cssModuleFileName The filename of the CSS module file.
 * @param options Options for writing the d.ts file.
 * @throws {WriteDtsFileError} When the file cannot be written.
 */
export async function writeDtsFile(
  text: string,
  cssModuleFileName: string,
  options: WriteDtsFileOption,
): Promise<void> {
  const dtsFileName = getDtsFilePath(cssModuleFileName, options);
  try {
    await mkdir(dirname(dtsFileName), { recursive: true });
    await writeFile(dtsFileName, text);
  } catch (error) {
    throw new WriteDtsFileError(dtsFileName, error);
  }
}
