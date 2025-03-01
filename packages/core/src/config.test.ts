import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { findTsConfigFile, normalizeConfig, readTsConfigFile } from './config.js';
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
          "cmkOptions": {
            "dtsOutDir": "generated/cmk"
          }
        }
      `,
    });
    expect(readTsConfigFile(iff.rootDir)).toStrictEqual({
      configFileName: iff.paths['tsconfig.json'],
      config: {
        includes: ['src'],
        excludes: ['src/test'],
        paths: undefined,
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: undefined,
      },
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
        excludes: undefined,
        paths: undefined,
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: true,
      },
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
            "paths": {
              "@/*": ["./*", 1],
              "#/*": 1,
            }
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
        paths: { '@/*': ['./*'] },
        dtsOutDir: undefined,
        arbitraryExtensions: undefined,
      },
      diagnostics: [
        {
          type: 'semantic',
          category: 'error',
          text: '`dtsOutDir` must be a string.',
          fileName: iff.paths['tsconfig.json'],
        },
        {
          type: 'semantic',
          category: 'error',
          text: '`arbitraryExtensions` must be a boolean.',
          fileName: iff.paths['tsconfig.json'],
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
            "cmkOptions": { "dtsOutDir": "generated/cmk" }
          }
        `,
        'tsconfig.json': dedent`
          {
            "extends": "./tsconfig.base.json",
            "cmkOptions": { "arbitraryExtensions": true }
          }
        `,
      });
      expect(readTsConfigFile(iff.rootDir).config).toStrictEqual({
        includes: undefined,
        excludes: undefined,
        paths: undefined,
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: true,
      });
    });
    test('does not merge arrays and objects, but overwrites them', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': dedent`
          {
            "include": ["include1"],
            "exclude": ["exclude1"],
            "compilerOptions": {
              "paths": { "@/*": ["./paths1/*"] }
            }
          }
        `,
        'tsconfig.json': dedent`
          {
            "extends": "./tsconfig.base.json",
            "include": ["include2"],
            "exclude": ["exclude2"],
            "compilerOptions": {
              "paths": { "@/*": ["./paths2/*"], "#/*": ["./paths2/*"] }
            }
          }
        `,
      });
      expect(readTsConfigFile(iff.rootDir).config).toStrictEqual({
        includes: ['include2'],
        excludes: ['exclude2'],
        paths: { '@/*': ['./paths2/*'], '#/*': ['./paths2/*'] },
        dtsOutDir: undefined,
        arbitraryExtensions: undefined,
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
        includes: undefined,
        excludes: undefined,
        paths: undefined,
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
        includes: undefined,
        excludes: undefined,
        paths: undefined,
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: undefined,
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
        includes: undefined,
        excludes: undefined,
        paths: undefined,
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
        includes: undefined,
        excludes: undefined,
        paths: undefined,
        dtsOutDir: 'generated/cmk',
        arbitraryExtensions: true,
      });
    });
  });
});

describe('normalizeConfig', () => {
  const defaultConfig = {
    includes: undefined,
    excludes: undefined,
    paths: undefined,
    dtsOutDir: undefined,
    arbitraryExtensions: undefined,
  };
  test('resolves options', () => {
    expect(
      normalizeConfig(
        {
          ...defaultConfig,
          includes: ['src'],
          excludes: ['src/test'],
          dtsOutDir: 'generated',
        },
        '/app',
      ),
    ).toMatchInlineSnapshot(`
      {
        "arbitraryExtensions": false,
        "dtsOutDir": "/app/generated",
        "excludes": [
          "/app/src/test",
        ],
        "includes": [
          "/app/src",
        ],
        "paths": {},
      }
    `);
  });
  test('resolves paths', () => {
    expect(
      normalizeConfig(
        {
          ...defaultConfig,
          paths: { '@/*': ['./*'] },
          dtsOutDir: 'generated',
        },
        '/app',
      ),
    ).toMatchInlineSnapshot(`
      {
        "arbitraryExtensions": false,
        "dtsOutDir": "/app/generated",
        "excludes": [],
        "includes": [
          "/app/**/*",
        ],
        "paths": {
          "@/*": [
            "/app/*",
          ],
        },
      }
    `);
  });
});
