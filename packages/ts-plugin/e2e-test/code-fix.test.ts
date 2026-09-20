import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vite-plus/test';
import {
  CANNOT_FIND_NAME_ERROR_CODE,
  PROPERTY_DOES_NOT_EXIST_ERROR_CODES,
} from '../src/language-service/feature/code-fix.js';
import { buildStylesImport, buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { formatPath, launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('fixMissingCSSRule', () => {
    test.each([
      [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[0], 'Property does not exist'],
      [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[1], 'Property does not exist. Did you mean ...?'],
    ])('appends a CSS rule for the missing token to the CSS module for TS%i (%s)', async (errorCode) => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
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
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const { start, end } = getFileSpan('index.ts', 'a_2');
      const actions = await tsserver.sendGetCodeFixes({
        errorCodes: [errorCode],
        file: iff.paths['index.ts'],
        startLine: start.line,
        startOffset: start.offset,
        endLine: end.line,
        endOffset: end.offset,
      });

      expect(actions).toStrictEqual([
        {
          fixName: 'fixMissingCSSRule',
          changes: [
            {
              fileName: formatPath(iff.paths['a.module.css']),
              textChanges: [{ start: { line: 3, offset: 2 }, end: { line: 3, offset: 2 }, newText: '\n.a_2 {\n  \n}' }],
            },
          ],
        },
      ]);
    });

    test('inserts the rule into the CSS module bound to the accessed identifier', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          ${buildStylesImport('./b.module.css', { namedExports, name: 'bStyles' })}
          bStyles.b_1;
        `,
        'a.module.css': '',
        'b.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const { start, end } = getFileSpan('index.ts', 'b_1');
      const actions = await tsserver.sendGetCodeFixes({
        errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[0]],
        file: iff.paths['index.ts'],
        startLine: start.line,
        startOffset: start.offset,
        endLine: end.line,
        endOffset: end.offset,
      });

      expect(actions).toStrictEqual([
        {
          fixName: 'fixMissingCSSRule',
          changes: [
            {
              fileName: formatPath(iff.paths['b.module.css']),
              textChanges: [{ start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 }, newText: '\n.b_1 {\n  \n}' }],
            },
          ],
        },
      ]);
    });
  });

  describe('auto-import', () => {
    test('provides a code fix that imports styles from the CSS module', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': `styles;`,
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const { start, end } = getFileSpan('index.ts', 'styles');
      const actions = await tsserver.sendGetCodeFixes({
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        file: iff.paths['index.ts'],
        startLine: start.line,
        startOffset: start.offset,
        endLine: end.line,
        endOffset: end.offset,
      });

      const importStatement = buildStylesImport('./a.module.css', { namedExports, quote: 'double' });
      expect(actions).toStrictEqual([
        {
          fixName: 'import',
          changes: [
            {
              fileName: formatPath(iff.paths['index.ts']),
              textChanges: [
                {
                  start: { line: 1, offset: 1 },
                  end: { line: 1, offset: 1 },
                  newText: `${importStatement}${ts.sys.newLine}${ts.sys.newLine}`,
                },
              ],
            },
          ],
        },
      ]);
    });

    test('provides no code fix that imports styles from a generated .d.ts file', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports, dtsOutDir: 'generated' },
        }),
        'index.ts': `styles;`,
        'generated/a.module.css.d.ts': dedent`
          const styles: {};
          export default styles;
        `,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const { start, end } = getFileSpan('index.ts', 'styles');
      const actions = await tsserver.sendGetCodeFixes({
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        file: iff.paths['index.ts'],
        startLine: start.line,
        startOffset: start.offset,
        endLine: end.line,
        endOffset: end.offset,
      });

      expect(actions).toStrictEqual([]);
    });
  });

  describe.runIf(namedExports)('prioritizeNamedImports: false', () => {
    test('omits the named import code fix', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports, prioritizeNamedImports: false },
        }),
        'index.ts': `a_1;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const { start, end } = getFileSpan('index.ts', 'a_1');
      const actions = await tsserver.sendGetCodeFixes({
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        file: iff.paths['index.ts'],
        startLine: start.line,
        startOffset: start.offset,
        endLine: end.line,
        endOffset: end.offset,
      });

      expect(actions).toStrictEqual([]);
    });
  });

  describe.runIf(namedExports)('prioritizeNamedImports: true', () => {
    test('omits the default styles binding code fix', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports, prioritizeNamedImports: true },
        }),
        'index.ts': `styles;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const { start, end } = getFileSpan('index.ts', 'styles');
      const actions = await tsserver.sendGetCodeFixes({
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        file: iff.paths['index.ts'],
        startLine: start.line,
        startOffset: start.offset,
        endLine: end.line,
        endOffset: end.offset,
      });

      expect(actions).toStrictEqual([]);
    });

    test('provides a named import code fix', async () => {
      const { iff, getFileSpan } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports, prioritizeNamedImports: true },
        }),
        'index.ts': `a_1;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const { start, end } = getFileSpan('index.ts', 'a_1');
      const actions = await tsserver.sendGetCodeFixes({
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        file: iff.paths['index.ts'],
        startLine: start.line,
        startOffset: start.offset,
        endLine: end.line,
        endOffset: end.offset,
      });

      expect(actions).toStrictEqual([
        {
          fixName: 'import',
          changes: [
            {
              fileName: formatPath(iff.paths['index.ts']),
              textChanges: [
                {
                  start: { line: 1, offset: 1 },
                  end: { line: 1, offset: 1 },
                  newText: `import { a_1 } from "./a.module.css";${ts.sys.newLine}${ts.sys.newLine}`,
                },
              ],
            },
          ],
        },
      ]);
    });
  });
});
