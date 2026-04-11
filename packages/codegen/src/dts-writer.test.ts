import { resolve } from '@css-modules-kit/core';
import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { getDtsFilePath, writeDtsFile } from './dts-writer.js';
import { WriteDtsFileError } from './error.js';
import { createIFF } from './test/fixture.js';

describe('getDtsFilePath', () => {
  const options = { basePath: '/app', outDir: '/app/dist', arbitraryExtensions: false };
  test('cwd', () => {
    expect(getDtsFilePath('/app1/src/dir/a.module.css', { ...options, basePath: '/app1' })).toBe(
      resolve('/app/dist/src/dir/a.module.css.d.ts'),
    );
  });
  test('outDir', () => {
    expect(getDtsFilePath('/app/src/dir/a.module.css', { ...options, outDir: '/app/dist/dir' })).toBe(
      resolve('/app/dist/dir/src/dir/a.module.css.d.ts'),
    );
  });
  test('arbitraryExtensions', () => {
    expect(getDtsFilePath('/app/src/dir/a.module.css', { ...options, arbitraryExtensions: true })).toBe(
      resolve('/app/dist/src/dir/a.module.d.css.ts'),
    );
  });
});

describe('writeDtsFile', () => {
  test('writes a d.ts file', async () => {
    const iff = await createIFF({});
    await writeDtsFile(
      dedent`
        declare const styles: { local1: string };
        export default styles;
      `,
      iff.join('src/a.module.css'),
      {
        outDir: iff.join('generated'),
        basePath: iff.rootDir,
        arbitraryExtensions: false,
      },
    );
    expect(await iff.readFile('generated/src/a.module.css.d.ts')).toMatchInlineSnapshot(`
      "declare const styles: { local1: string };
      export default styles;"
    `);
  });
  test('throws an error when the file cannot be written', async () => {
    const iff = await createIFF({
      // A directory exists at the same path
      'generated/src/a.module.css.d.ts': {},
    });
    await expect(
      writeDtsFile(
        dedent`
          declare const styles: { local1: string };
          export default styles;
        `,
        iff.join('src/a.module.css'),
        {
          outDir: iff.join('generated'),
          basePath: iff.rootDir,
          arbitraryExtensions: false,
        },
      ),
    ).rejects.toThrow(WriteDtsFileError);
  });
});
