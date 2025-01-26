import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, parse, relative, resolve } from 'node:path';
import type { SystemDiagnostic } from 'honey-css-modules-core';

/**
 * Get .d.ts file path.
 * @param cssModuleFilename The path to the CSS Module file (i.e. `/src/foo.module.css`). It is absolute.
 * @param options Output directory options
 * @returns The path to the .d.ts file. It is absolute.
 */
export function getDtsFilePath(cssModuleFilename: string, options: WriteDtsFileOption): string {
  const relativePath = relative(options.cwd, cssModuleFilename);
  const outputFilePath = resolve(options.cwd, options.outDir, relativePath);

  if (options.arbitraryExtensions) {
    const { dir, name, ext } = parse(outputFilePath);
    return join(dir, `${name}.d${ext}.ts`);
  } else {
    return `${outputFilePath}.d.ts`;
  }
}

export interface WriteDtsFileOption {
  /** Directory to write the d.ts file. This is relative to {@link cwd}. */
  outDir: string;
  /** Current working directory. */
  cwd: string;
  /** Generate `.d.css.ts` instead of `.css.d.ts`. */
  arbitraryExtensions: boolean;
}

/**
 * Write a d.ts file to the file system.
 * @param dtsCode The d.ts code to write.
 * @param cssModuleFilename The filename of the CSS module file.
 * @param options Options for writing the d.ts file.
 */
export async function writeDtsFile(
  dtsCode: string,
  cssModuleFilename: string,
  options: WriteDtsFileOption,
): Promise<undefined | SystemDiagnostic> {
  const dtsFilename = getDtsFilePath(cssModuleFilename, options);
  try {
    await mkdir(dirname(dtsFilename), { recursive: true });
  } catch (error) {
    return { type: 'system', category: 'error', text: `Failed to create directory ${dtsFilename}.`, cause: error };
  }
  try {
    await writeFile(dtsFilename, dtsCode);
  } catch (error) {
    return { type: 'system', category: 'error', text: `Failed to write file ${dtsFilename}.`, cause: error };
  }
  return undefined;
}
