import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { formatPath, launchLSPClient } from './test-util/lsp-client.js';
import { testFailsIf } from './test-util/test.js';

const CANNOT_FIND_NAME_ERROR_CODE = 2304;
const PROPERTY_DOES_NOT_EXIST_ERROR_CODES: [number, number] = [2339, 2551];

const client = launchLSPClient(fixtureDir);

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('fixMissingCSSRule', () => {
    // TODO(middleware): No code fix edits a CSS module.
    test.fails.each([
      [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[0], 'Property does not exist'],
      [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[1], 'Property does not exist. Did you mean ...?'],
    ])('appends a CSS rule for the missing token to the CSS module for TS%i (%s)', async (errorCode) => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_2;
        `,
        'a.module.css': dedent`
          .a_1 {
            color: red;
          }
        `,
      });
      await client.openFiles([iff.paths['index.ts']]);

      const actions = await client.sendCodeActions({
        ...getFileSpan('index.ts', 'a_2'),
        errorCodes: [errorCode],
        only: ['quickfix'],
      });

      expect(actions).toStrictEqual([
        {
          title: "Add missing CSS rule '.a_2'",
          kind: 'quickfix',
          edits: [
            {
              file: formatPath(iff.paths['a.module.css']),
              textEdits: [
                {
                  range: { start: { line: 2, character: 1 }, end: { line: 2, character: 1 } },
                  newText: '\n.a_2 {\n  \n}',
                },
              ],
            },
          ],
          createdFiles: [],
        },
      ]);
    });

    // TODO(middleware): No code fix edits a CSS module.
    test.fails('inserts the rule into the CSS module bound to the accessed identifier', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          ${buildStylesImport('./b.module.css', { namedExports, name: 'bStyles' })}
          bStyles.b_1;
        `,
        'a.module.css': '',
        'b.module.css': '',
      });
      await client.openFiles([iff.paths['index.ts']]);

      const actions = await client.sendCodeActions({
        ...getFileSpan('index.ts', 'b_1'),
        errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[0]],
        only: ['quickfix'],
      });

      expect(actions).toStrictEqual([
        {
          title: "Add missing CSS rule '.b_1'",
          kind: 'quickfix',
          edits: [
            {
              file: formatPath(iff.paths['b.module.css']),
              textEdits: [
                {
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  newText: '\n.b_1 {\n  \n}',
                },
              ],
            },
          ],
          createdFiles: [],
        },
      ]);
    });
  });

  describe('auto-import', () => {
    // TODO(middleware): The default import is inserted even in named-exports mode.
    testFailsIf(namedExports)('provides a code fix that imports styles from the CSS module', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ mapperOptions: { namedExports } }),
        'index.ts': `styles;`,
        'a.module.css': '',
      });
      await client.openFiles([iff.paths['index.ts']]);

      const actions = await client.sendCodeActions({
        ...getFileSpan('index.ts', 'styles'),
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        only: ['quickfix'],
      });

      const importStatement = buildStylesImport('./a.module.css', { namedExports, quote: 'double' });
      expect(actions).toStrictEqual([
        {
          title: 'Add import from "./a.module.css"',
          kind: 'quickfix',
          edits: [
            {
              file: formatPath(iff.paths['index.ts']),
              textEdits: [
                {
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  newText: `${importStatement}\n\n`,
                },
              ],
            },
          ],
          createdFiles: [],
        },
      ]);
    });
  });

  describe.runIf(namedExports)('prioritizeNamedImports: false', () => {
    // TODO(middleware): The named exports of a CSS module are imported like the ones of any other module.
    test.fails('omits the named import code fix', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          mapperOptions: { namedExports, prioritizeNamedImports: false },
        }),
        'index.ts': `a_1;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFiles([iff.paths['index.ts']]);

      const actions = await client.sendCodeActions({
        ...getFileSpan('index.ts', 'a_1'),
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        only: ['quickfix'],
      });

      expect(actions).toStrictEqual([]);
    });
  });

  describe.runIf(namedExports)('prioritizeNamedImports: true', () => {
    test('omits the default styles binding code fix', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          mapperOptions: { namedExports, prioritizeNamedImports: true },
        }),
        'index.ts': `styles;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFiles([iff.paths['index.ts']]);

      const actions = await client.sendCodeActions({
        ...getFileSpan('index.ts', 'styles'),
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        only: ['quickfix'],
      });

      expect(actions).toStrictEqual([]);
    });

    test('provides a named import code fix', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          mapperOptions: { namedExports, prioritizeNamedImports: true },
        }),
        'index.ts': `a_1;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await client.openFiles([iff.paths['index.ts']]);

      const actions = await client.sendCodeActions({
        ...getFileSpan('index.ts', 'a_1'),
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        only: ['quickfix'],
      });

      expect(actions).toStrictEqual([
        {
          title: 'Add import from "./a.module.css"',
          kind: 'quickfix',
          edits: [
            {
              file: formatPath(iff.paths['index.ts']),
              textEdits: [
                {
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  newText: `import { a_1 } from "./a.module.css";\n\n`,
                },
              ],
            },
          ],
          createdFiles: [],
        },
      ]);
    });
  });
});
