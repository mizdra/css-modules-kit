import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vite-plus/test';
import type { CMKConfig } from './config.js';
import { readConfigFile } from './config.js';
import { TsConfigFileNotFoundError } from './error.js';
import { createIFF } from './test/fixture.js';

describe('readConfigFile', () => {
  test('finds tsconfig.json in the directory given as the project', async () => {
    const iff = await createIFF({ 'tsconfig.json': '{}' });
    expect(readConfigFile(iff.rootDir).configFileName).toBe(iff.paths['tsconfig.json']);
  });
  test('reads the tsconfig file given as the project', async () => {
    const iff = await createIFF({
      'tsconfig.json': '{}',
      'tsconfig.src.json': '{}',
    });
    expect(readConfigFile(iff.paths['tsconfig.src.json']).configFileName).toBe(iff.paths['tsconfig.src.json']);
  });
  test('throws TsConfigFileNotFoundError when no tsconfig is found', async () => {
    const iff = await createIFF({});
    expect(() => readConfigFile(iff.join('unknown'))).toThrow(TsConfigFileNotFoundError);
  });
  test('returns the default options for an empty tsconfig', async () => {
    const iff = await createIFF({ 'tsconfig.json': '{}' });
    expect(readConfigFile(iff.rootDir)).toStrictEqual<CMKConfig>(
      expect.objectContaining({
        includes: [iff.join('**/*')],
        excludes: [],
        dtsOutDir: iff.join('generated'),
        arbitraryExtensions: false,
        namedExports: false,
        prioritizeNamedImports: false,
        animation: true,
        dashedIdents: false,
        container: false,
        enabled: false,
        compilerOptions: expect.any(Object),
        wildcardDirectories: [{ fileName: iff.rootDir, recursive: true }],
      }),
    );
  });
  test('reads the options specified in tsconfig', async () => {
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
            "animation": false,
            "dashedIdents": true,
            "container": true,
            "enabled": true
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
        animation: false,
        dashedIdents: true,
        container: true,
        enabled: true,
        compilerOptions: expect.objectContaining({
          module: ts.ModuleKind.ESNext,
        }),
        wildcardDirectories: [{ fileName: iff.join('src'), recursive: true }],
      }),
    );
  });
  describe('inheritance', () => {
    test('inherits options from the tsconfig specified in `extends`', async () => {
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
              "animation": false,
              "dashedIdents": true,
              "container": true,
              "enabled": true
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
          animation: false,
          dashedIdents: true,
          container: true,
          enabled: true,
          compilerOptions: expect.objectContaining({
            module: ts.ModuleKind.ESNext,
          }),
          wildcardDirectories: [{ fileName: iff.join('src'), recursive: true }],
        }),
      );
    });
    test('prefers the options of the extending tsconfig over the inherited ones', async () => {
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
    test('inherits options through a chain of `extends`', async () => {
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
    test('prefers the nearer tsconfig in a chain of `extends`', async () => {
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
    test('inherits options from a tsconfig in a package', async () => {
      const iff = await createIFF({
        'node_modules/some-pkg/tsconfig.json': dedent`
          {
            "cmkOptions": { "dtsOutDir": "\${configDir}/generated/cmk" }
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
    test('inherits options from every tsconfig in an `extends` array', async () => {
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
    test('skips an `extends` entry that points to a non-existent file', async () => {
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
    test('resolves relative paths against the defining tsconfig directory', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': dedent`
          {
            "include": ["src"],
            "exclude": ["dist"],
            "cmkOptions": {
              "dtsOutDir": "generated"
            }
          }
        `,
        'app/tsconfig.json': dedent`
          {
            "extends": "../tsconfig.base.json"
          }
        `,
      });
      const result = readConfigFile(iff.join('app'));
      expect(result.includes).toEqual([iff.join('src')]);
      expect(result.excludes).toEqual([iff.join('dist')]);
      expect(result.dtsOutDir).toBe(iff.join('generated'));
    });
  });
  describe('diagnostics', () => {
    test.each([
      'enabled',
      'arbitraryExtensions',
      'namedExports',
      'prioritizeNamedImports',
      'animation',
      'dashedIdents',
      'container',
    ])('reports an error if `%s` is not a boolean', async (option) => {
      const iff = await createIFF({
        'tsconfig.json': `{ "cmkOptions": { "${option}": 1 } }`,
      });
      expect(readConfigFile(iff.rootDir).diagnostics).toStrictEqual([
        {
          category: 'error',
          text: `\`${option}\` in ${iff.paths['tsconfig.json']} must be a boolean.`,
        },
      ]);
    });
    test('reports an error if `dtsOutDir` is not a string', async () => {
      const iff = await createIFF({
        'tsconfig.json': '{ "cmkOptions": { "dtsOutDir": 1 } }',
      });
      expect(readConfigFile(iff.rootDir).diagnostics).toStrictEqual([
        {
          category: 'error',
          text: `\`dtsOutDir\` in ${iff.paths['tsconfig.json']} must be a string.`,
        },
      ]);
    });
    // NOTE: The errors for `include` and `exclude` are reported by `tsc` or `tsserver`.
    test('drops non-string entries from `include` and `exclude` without reporting them', async () => {
      const iff = await createIFF({
        'tsconfig.json': dedent`
          {
            "include": ["src", 1],
            "exclude": ["src/test", 1]
          }
        `,
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          includes: [iff.join('src')],
          excludes: [iff.join('src/test')],
          diagnostics: [],
        }),
      );
    });
    test('reads the options of a tsconfig with JSON syntax errors without reporting them', async () => {
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
    test('also reports the diagnostics of the extended tsconfig', async () => {
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
  describe('deprecated `keyframes` option', () => {
    test('adopts the `keyframes` value as `animation` and reports a deprecation warning', async () => {
      const iff = await createIFF({
        'tsconfig.json': '{ "cmkOptions": { "keyframes": false } }',
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          animation: false,
          diagnostics: [
            {
              category: 'warning',
              text: `\`keyframes\` in ${iff.paths['tsconfig.json']} is deprecated. Use the \`animation\` option instead.`,
            },
          ],
        }),
      );
    });
    test('inherits the `keyframes` value from the extended tsconfig and reports a deprecation warning', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': '{ "cmkOptions": { "keyframes": false } }',
        'tsconfig.json': '{ "extends": "./tsconfig.base.json" }',
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          animation: false,
          diagnostics: [
            {
              category: 'warning',
              text: `\`keyframes\` in ${iff.paths['tsconfig.base.json']} is deprecated. Use the \`animation\` option instead.`,
            },
          ],
        }),
      );
    });
    test('reports an error and adopts the `animation` value if both `keyframes` and `animation` are specified', async () => {
      const iff = await createIFF({
        'tsconfig.json': '{ "cmkOptions": { "keyframes": true, "animation": false } }',
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          animation: false,
          diagnostics: [
            {
              category: 'warning',
              text: `\`keyframes\` in ${iff.paths['tsconfig.json']} is deprecated. Use the \`animation\` option instead.`,
            },
            {
              category: 'error',
              text: `\`keyframes\` and \`animation\` in ${iff.paths['tsconfig.json']} cannot be used together. Remove \`keyframes\`.`,
            },
          ],
        }),
      );
    });
    test('reports an error if `keyframes` and `animation` are specified in separate tsconfig files linked by `extends`', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': '{ "cmkOptions": { "keyframes": true } }',
        'tsconfig.json': dedent`
          {
            "extends": "./tsconfig.base.json",
            "cmkOptions": { "animation": false }
          }
        `,
      });
      expect(readConfigFile(iff.rootDir)).toStrictEqual(
        expect.objectContaining({
          animation: false,
          diagnostics: [
            {
              category: 'warning',
              text: `\`keyframes\` in ${iff.paths['tsconfig.base.json']} is deprecated. Use the \`animation\` option instead.`,
            },
            {
              category: 'error',
              text: `\`keyframes\` and \`animation\` in ${iff.paths['tsconfig.json']} cannot be used together. Remove \`keyframes\`.`,
            },
          ],
        }),
      );
    });
  });
  describe('wildcardDirectories', () => {
    test('marks the directory of an `include` pattern that ends with `/*` as non-recursive', async () => {
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
  describe('configDir template variable', () => {
    // oxlint-disable-next-line no-template-curly-in-string
    test('resolves ${configDir} in an extended tsconfig to the directory of the entry tsconfig', async () => {
      const iff = await createIFF({
        'tsconfig.base.json': dedent`
          {
            "include": ["\${configDir}/src"],
            "exclude": ["\${configDir}/dist"],
            "cmkOptions": {
              "dtsOutDir": "\${configDir}/generated"
            }
          }
        `,
        'app/tsconfig.json': dedent`
          {
            "extends": "../tsconfig.base.json",
          }
        `,
      });
      const result = readConfigFile(iff.join('app'));
      expect(result.includes).toEqual([iff.join('app/src')]);
      expect(result.excludes).toEqual([iff.join('app/dist')]);
      expect(result.dtsOutDir).toBe(iff.join('app/generated'));
    });
    // oxlint-disable-next-line no-template-curly-in-string
    test('does not replace ${configDir} if it is not at the start of the path', async () => {
      const iff = await createIFF({
        'tsconfig.json': dedent`
          {
            "include": ["./\${configDir}/src"]
          }
        `,
      });
      const result = readConfigFile(iff.rootDir);
      // oxlint-disable-next-line no-template-curly-in-string
      expect(result.includes).toEqual([iff.join('${configDir}/src')]);
    });
    // oxlint-disable-next-line no-template-curly-in-string
    test('replaces ${configDir} case-insensitively', async () => {
      const iff = await createIFF({
        'tsconfig.json': dedent`
          {
            "include": ["\${CONFIGDIR}/src"]
          }
        `,
      });
      const result = readConfigFile(iff.rootDir);
      expect(result.includes).toEqual([iff.join('src')]);
    });
  });
});
