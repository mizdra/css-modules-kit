import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { findTsConfigFile, readTsConfigFile } from './config.js';
import { TsConfigFileNotFoundError } from './error.js';
import { createIFF } from './test/fixture.js';

test('findTsConfigFile', async () => {
  const iff = await createIFF({
    'tsconfig.json': '{}',
    'tsconfig.src.json': '{}',
    'sub/tsconfig.json': '{}',
  });
  expect(findTsConfigFile(iff.rootDir)).toEqual(iff.paths['tsconfig.json']);
  expect(findTsConfigFile(iff.paths['tsconfig.src.json'])).toEqual(iff.paths['tsconfig.src.json']);
  expect(findTsConfigFile(iff.paths['sub'])).toEqual(iff.paths['sub/tsconfig.json']);
});

describe('readTsConfigFile', () => {
  test('returns a config object', async () => {
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
            "arbitraryExtensions": false,
            "namedExports": true,
            "prioritizeNamedImports": true,
            "keyframes": false
          }
        }
      `,
    });
    expect(readTsConfigFile(iff.rootDir)).toStrictEqual({
      configFileName: iff.paths['tsconfig.json'],
      config: {
        includes: ['src'],
        excludes: ['src/test'],
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: false,
        namedExports: true,
        prioritizeNamedImports: true,
        keyframes: false,
      },
      compilerOptions: expect.objectContaining({
        module: ts.ModuleKind.ESNext,
      }),
      diagnostics: [],
    });
  });
  test('returns a config object if config file has syntax errors', async () => {
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
    expect(readTsConfigFile(iff.rootDir)).toStrictEqual({
      configFileName: iff.paths['tsconfig.json'],
      config: {
        includes: ['src'],
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: true,
      },
      compilerOptions: expect.any(Object),
      diagnostics: [],
    });
  });
  test('returns a config object with diagnostics if config file has semantic errors', async () => {
    const iff = await createIFF({
      'tsconfig.json': dedent`
        {
          "include": ["src", 1],
          "exclude": ["src/test", 1],
          "compilerOptions": {
            "module": 1
          },
          "cmkOptions": {
            "dtsOutDir": 1,
            "arbitraryExtensions": 1
            //                     ^ error: "arbitraryExtensions" must be a boolean
          }
        }
      `,
    });
    // MEMO: The errors not derived from `cmkOptions` are not returned.
    expect(readTsConfigFile(iff.rootDir)).toStrictEqual({
      configFileName: iff.paths['tsconfig.json'],
      config: {
        includes: ['src'],
        excludes: ['src/test'],
      },
      compilerOptions: expect.objectContaining({
        module: undefined,
      }),
      diagnostics: [
        {
          category: 'error',
          text: `\`dtsOutDir\` in ${iff.paths['tsconfig.json']} must be a string.`,
        },
        {
          category: 'error',
          text: `\`arbitraryExtensions\` in ${iff.paths['tsconfig.json']} must be a boolean.`,
        },
      ],
    });
  });
  test('throws error if no config file is found', async () => {
    const iff = await createIFF({});
    expect(() => readTsConfigFile(iff.rootDir)).toThrow(TsConfigFileNotFoundError);
  });
  describe('supports `extends`', () => {
    test('inherits from a file', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': dedent`
          {
            "include": ["src"],
            "exclude": ["src/test"],
            "cmkOptions": {
              "dtsOutDir": "generated/cmk",
              "arbitraryExtensions": true,
              "namedExports": true,
              "prioritizeNamedImports": true
            }
          }
        `,
        'tsconfig.json': dedent`
          {
            "extends": "./tsconfig.base.json",
          }
        `,
      });
      expect(readTsConfigFile(iff.rootDir).config).toStrictEqual({
        includes: ['src'],
        excludes: ['src/test'],
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: true,
        namedExports: true,
        prioritizeNamedImports: true,
      });
    });
    test('merges root config with base config', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': dedent`
          {
            "include": ["src1"],
            "exclude": ["src1/test"],
            "cmkOptions": { "dtsOutDir": "generated1/cmk" }
          }
        `,
        'tsconfig.json': dedent`
          {
            "extends": "./tsconfig.base.json",
            "include": ["src2"],
            "exclude": ["src2/test"],
            "cmkOptions": { "dtsOutDir": "generated2/cmk" }
          }
        `,
      });
      expect(readTsConfigFile(iff.rootDir).config).toStrictEqual({
        includes: ['src2'],
        excludes: ['src2/test'],
        dtsOutDir: 'generated2/cmk',
      });
    });
    test('inherits from a file recursively', async () => {
      const iff = await createIFF({
        'tsconfig.base1.json': dedent`
          {
            "cmkOptions": { "dtsOutDir": "generated/cmk" },
          }
        `,
        'tsconfig.base2.json': dedent`
          {
            "extends": "./tsconfig.base1.json",
            "cmkOptions": { "arbitraryExtensions": true }
          }
        `,
        'tsconfig.json': dedent`
          {
            "extends": "./tsconfig.base2.json"
          }
        `,
      });
      expect(readTsConfigFile(iff.rootDir).config).toStrictEqual({
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: true,
      });
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
      expect(readTsConfigFile(iff.rootDir).config).toStrictEqual({
        dtsOutDir: 'generated/cmk',
      });
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
      expect(readTsConfigFile(iff.rootDir).config).toStrictEqual({
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: true,
      });
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
      expect(readTsConfigFile(iff.rootDir).config).toStrictEqual({
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: true,
      });
    });
  });
});
