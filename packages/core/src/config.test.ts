import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import type { CMKConfig } from './config.js';
import { readConfigFile } from './config.js';
import { TsConfigFileNotFoundError } from './error.js';
import { createIFF } from './test/fixture.js';

describe('readConfigFile', () => {
  test('finds tsconfig files by the path of tsconfig or directory', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'tsconfig.src.json': '{}',
    });
    expect(readConfigFile(iff.rootDir).configFileName).toBe(iff.paths['tsconfig.json']);
    expect(readConfigFile(iff.paths['tsconfig.src.json']).configFileName).toBe(iff.paths['tsconfig.src.json']);
    expect(() => readConfigFile(iff.join('unknown'))).toThrow(TsConfigFileNotFoundError);
  });
  test('returns the default options even if tsconfig is empty', async () => {
    const iff = await createIFF({ 'tsconfig.json': '{}' });
    expect(readConfigFile(iff.rootDir)).toStrictEqual<CMKConfig>(
      expect.objectContaining({
        includes: [iff.join('**/*')],
        excludes: [],
        dtsOutDir: iff.join('generated'),
        arbitraryExtensions: false,
        namedExports: false,
        prioritizeNamedImports: false,
        keyframes: true,
        compilerOptions: expect.any(Object),
        wildcardDirectories: [{ fileName: iff.rootDir, recursive: true }],
      }),
    );
  });
  test('default option values are overridden by config file values', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "include": ["src"],
          "exclude": ["src/test"],
          "compilerOptions": {
            "module": "esnext"
          },
          "cmkOptions": {
            "dtsOutDir": "generated/cmk",
            "arbitraryExtensions": true,
            "namedExports": true,
            "prioritizeNamedImports": true,
            "keyframes": false
          }
        }
      `,
    });
    expect(readConfigFile(iff.rootDir)).toStrictEqual(
      expect.objectContaining({
        includes: [iff.join('src')],
        excludes: [iff.join('src/test')],
        dtsOutDir: iff.join('generated/cmk'),
        arbitraryExtensions: true,
        namedExports: true,
        prioritizeNamedImports: true,
        keyframes: false,
        compilerOptions: expect.objectContaining({
          module: ts.ModuleKind.ESNext,
        }),
        wildcardDirectories: [{ fileName: iff.join('src'), recursive: true }],
      }),
    );
  });
  describe('inheritance', () => {
    test('inherits options from other tsconfig by `extends`', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': dedent`
        {
          "include": ["src"],
          "exclude": ["src/test"],
          "compilerOptions": {
            "module": "esnext"
          },
          "cmkOptions": {
            "dtsOutDir": "generated/cmk",
            "arbitraryExtensions": true,
            "namedExports": true,
            "prioritizeNamedImports": true,
            "keyframes": false
          }
        }
      `,
        'tsconfig.json': '{ "extends": "./tsconfig.base.json" }',
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          includes: [iff.join('src')],
          excludes: [iff.join('src/test')],
          dtsOutDir: iff.join('generated/cmk'),
          arbitraryExtensions: true,
          namedExports: true,
          prioritizeNamedImports: true,
          keyframes: false,
          compilerOptions: expect.objectContaining({
            module: ts.ModuleKind.ESNext,
          }),
          wildcardDirectories: [{ fileName: iff.join('src'), recursive: true }],
        }),
      );
    });
    test('inherited options can be overridden in the target tsconfig', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': dedent`
        {
          "include": ["src1"],
          "compilerOptions": {
            "module": "esnext"
          },
          "cmkOptions": { "dtsOutDir": "generated1" }
        }
      `,
        'tsconfig.json': dedent`
        {
          "extends": "./tsconfig.base.json",
          "include": ["src2"],
          "compilerOptions": {
            "module": "es2015"
          },
          "cmkOptions": { "dtsOutDir": "generated2" }
        }
      `,
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          includes: [iff.join('src2')],
          dtsOutDir: iff.join('generated2'),
          compilerOptions: expect.objectContaining({
            module: ts.ModuleKind.ES2015,
          }),
          wildcardDirectories: [{ fileName: iff.join('src2'), recursive: true }],
        }),
      );
    });
    test('inherits options from multiple tsconfig files by `extends`', async () => {
      const iff = await createIFF({
        'tsconfig.base1.json': dedent`
        {
          "include": ["src"],
          "compilerOptions": {
            "module": "esnext"
          },
          "cmkOptions": {
            "dtsOutDir": "generated/cmk"
          }
        }
      `,
        'tsconfig.base2.json': '{ "extends": "./tsconfig.base1.json" }',
        'tsconfig.json': '{ "extends": "./tsconfig.base2.json" }',
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual<CMKConfig>(
        expect.objectContaining({
          includes: [iff.join('src')],
          dtsOutDir: iff.join('generated/cmk'),
          compilerOptions: expect.objectContaining({
            module: ts.ModuleKind.ESNext,
          }),
          wildcardDirectories: [{ fileName: iff.join('src'), recursive: true }],
        }),
      );
    });
    test('inherited options are merged according to the order of inheritance', async () => {
      const iff = await createIFF({
        'tsconfig.base1.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": "generated1" }
        }
      `,
        'tsconfig.base2.json': dedent`
        {
          "extends": "./tsconfig.base1.json",
          "cmkOptions": { "dtsOutDir": "generated2" }
        }
      `,
        'tsconfig.json': dedent`
        {
          "extends": "./tsconfig.base2.json",
        }
      `,
      });
      expect(readConfigFile(iff.rootDir).dtsOutDir).toBe(iff.join('generated2'));
    });
    test('inherits from a package', async () => {
      const iff = await createIFF({
        'node_modules/some-pkg/tsconfig.json': dedent`
          {
            "cmkOptions": { "dtsOutDir": "generated/cmk" }
          }
        `,
        'tsconfig.json': dedent`
          {
            "extends": "some-pkg/tsconfig.json"
          }
        `,
      });
      expect(readConfigFile(iff.rootDir).dtsOutDir).toBe(iff.join('generated/cmk'));
    });
    test('inherits from multiple files', async () => {
      const iff = await createIFF({
        'tsconfig.base1.json': dedent`
          {
            "cmkOptions": { "dtsOutDir": "generated/cmk" }
          }
        `,
        'tsconfig.base2.json': dedent`
          {
            "cmkOptions": { "arbitraryExtensions": true }
          }
        `,
        'tsconfig.json': dedent`
          {
            "extends": ["./tsconfig.base1.json", "./tsconfig.base2.json"]
          }
        `,
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          dtsOutDir: iff.join('generated/cmk'),
          arbitraryExtensions: true,
        }),
      );
    });
    test('ignores un-existing files', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': dedent`
          {
            "extends": "./un-existing.json",
            "cmkOptions": { "dtsOutDir": "generated/cmk" }
          }
        `,
        'tsconfig.json': dedent`
          {
            "extends": ["./tsconfig.base.json", "./un-existing.json"],
            "cmkOptions": { "arbitraryExtensions": true }
          }
        `,
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          dtsOutDir: iff.join('generated/cmk'),
          arbitraryExtensions: true,
        }),
      );
    });
  });
  describe('diagnostics', () => {
    test('returns diagnostics and a config object with error values excluded if config file has semantic errors', async () => {
      const iff = await createIFF({
        'tsconfig.json': dedent`
        {
          "include": ["src", 1],
          "exclude": ["src/test", 1],
          "compilerOptions": {
            "module": 1
          },
          "cmkOptions": {
            "dtsOutDir": 1
          }
        }
      `,
      });
      // MEMO: The errors not derived from `cmkOptions` are not returned.
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          includes: [iff.join('src')],
          excludes: [iff.join('src/test')],
          compilerOptions: expect.objectContaining({
            module: undefined,
          }),
          wildcardDirectories: [{ fileName: iff.join('src'), recursive: true }],
          diagnostics: [
            {
              category: 'error',
              text: `\`dtsOutDir\` in ${iff.paths['tsconfig.json']} must be a string.`,
            },
          ],
        }),
      );
    });
    test('returns empty diagnostics and a config object if config file has syntax errors', async () => {
      const iff = await createIFF({
        'tsconfig.json': dedent`
        {
          "include": ["src"]
          //                ^ error: ',' is missing
          "cmkOptions": {
            "dtsOutDir": "generated/cmk"
            //                          ^ error: ',' is missing
            "arbitraryExtensions": true
          }
        }
      `,
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          includes: [iff.join('src')],
          dtsOutDir: iff.join('generated/cmk'),
          arbitraryExtensions: true,
          diagnostics: [],
        }),
      );
    });
    test('inherits diagnostics', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': dedent`
        {
          "cmkOptions": { "dtsOutDir": 1 }
        }
      `,
        'tsconfig.json': dedent`
        {
          "extends": "./tsconfig.base.json",
          "cmkOptions": { "arbitraryExtensions": 1 }
        }
      `,
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          diagnostics: [
            {
              category: 'error',
              text: `\`dtsOutDir\` in ${iff.paths['tsconfig.base.json']} must be a string.`,
            },
            {
              category: 'error',
              text: `\`arbitraryExtensions\` in ${iff.paths['tsconfig.json']} must be a boolean.`,
            },
          ],
        }),
      );
    });
  });
  describe('wildcardDirectories', () => {
    test('set root directory if "include" is missing', async () => {
      const iff = await createIFF({
        'tsconfig.json': '{}',
      });
      expect(readConfigFile(iff.rootDir).wildcardDirectories).toEqual([{ fileName: iff.rootDir, recursive: true }]);
    });
    test('non-recursive "include" pattern has `recursive === false`', async () => {
      const iff = await createIFF({
        'tsconfig.json': dedent`
          {
            "include": ["src1", "src2/**/*", "src3/*"]
          }
        `,
      });
      expect(readConfigFile(iff.rootDir).wildcardDirectories).toEqual([
        { fileName: iff.join('src1'), recursive: true },
        { fileName: iff.join('src2'), recursive: true },
        { fileName: iff.join('src3'), recursive: false },
      ]);
    });
  });
});
