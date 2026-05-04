import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vite-plus/test';
import {
  CANNOT_FIND_NAME_ERROR_CODE,
  PROPERTY_DOES_NOT_EXIST_ERROR_CODES,
} from '../../src/language-service/feature/code-fix.js';
import { buildStylesImport, buildTSConfigJSON } from '../../src/test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { formatPath, launchTsserver, normalizeCodeFixActions } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

describe.each([{ namedExports: false }, { namedExports: true }])('namedExports: $namedExports', ({ namedExports }) => {
  describe('fixMissingCSSRule', () => {
    test('inserts a new CSS rule into an empty CSS module', async () => {
      const { iff, getLoc } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': dedent`
          ${buildStylesImport('./a.module.css', { namedExports })}
          styles.a_1;
        `,
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const loc = getLoc('index.ts', 'a_1');
      const res = await tsserver.sendGetCodeFixes({
        errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[0]],
        file: iff.paths['index.ts'],
        startLine: loc.line,
        startOffset: loc.offset,
        endLine: loc.line,
        endOffset: loc.offset,
      });

      expect(normalizeCodeFixActions(res.body!)).toStrictEqual(
        normalizeCodeFixActions([
          {
            fixName: 'fixMissingCSSRule',
            changes: [
              {
                fileName: formatPath(iff.paths['a.module.css']),
                textChanges: [
                  { start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 }, newText: '\n.a_1 {\n  \n}' },
                ],
              },
            ],
          },
        ]),
      );
    });

    test('appends a new CSS rule to a non-empty CSS module', async () => {
      const { iff, getLoc } = await setupFixture({
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

      const loc = getLoc('index.ts', 'a_2');
      const res = await tsserver.sendGetCodeFixes({
        errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[0]],
        file: iff.paths['index.ts'],
        startLine: loc.line,
        startOffset: loc.offset,
        endLine: loc.line,
        endOffset: loc.offset,
      });

      expect(normalizeCodeFixActions(res.body!)).toStrictEqual(
        normalizeCodeFixActions([
          {
            fixName: 'fixMissingCSSRule',
            changes: [
              {
                fileName: formatPath(iff.paths['a.module.css']),
                textChanges: [
                  { start: { line: 3, offset: 2 }, end: { line: 3, offset: 2 }, newText: '\n.a_2 {\n  \n}' },
                ],
              },
            ],
          },
        ]),
      );
    });

    test('inserts the rule into the CSS module bound to the accessed identifier', async () => {
      const { iff, getLoc } = await setupFixture({
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

      const loc = getLoc('index.ts', 'b_1');
      const res = await tsserver.sendGetCodeFixes({
        errorCodes: [PROPERTY_DOES_NOT_EXIST_ERROR_CODES[0]],
        file: iff.paths['index.ts'],
        startLine: loc.line,
        startOffset: loc.offset,
        endLine: loc.line,
        endOffset: loc.offset,
      });

      expect(normalizeCodeFixActions(res.body!)).toStrictEqual(
        normalizeCodeFixActions([
          {
            fixName: 'fixMissingCSSRule',
            changes: [
              {
                fileName: formatPath(iff.paths['b.module.css']),
                textChanges: [
                  { start: { line: 1, offset: 1 }, end: { line: 1, offset: 1 }, newText: '\n.b_1 {\n  \n}' },
                ],
              },
            ],
          },
        ]),
      );
    });
  });

  describe('auto-import', () => {
    test('inserts the import statement when accepted', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({ cmkOptions: { namedExports } }),
        'index.ts': `styles;`,
        'a.module.css': '',
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const range = getRange('index.ts', 'styles');
      const res = await tsserver.sendGetCodeFixes({
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        file: iff.paths['index.ts'],
        startLine: range.start.line,
        startOffset: range.start.offset,
        endLine: range.end.line,
        endOffset: range.end.offset,
      });

      const importStatement = buildStylesImport('./a.module.css', { namedExports, quote: 'double' });
      expect(normalizeCodeFixActions(res.body!)).toStrictEqual(
        normalizeCodeFixActions([
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
        ]),
      );
    });

    test('excludes generated files from suggestions', async () => {
      const { iff, getRange } = await setupFixture({
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

      const range = getRange('index.ts', 'styles');
      const res = await tsserver.sendGetCodeFixes({
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        file: iff.paths['index.ts'],
        startLine: range.start.line,
        startOffset: range.start.offset,
        endLine: range.end.line,
        endOffset: range.end.offset,
      });

      expect(normalizeCodeFixActions(res.body!)).toStrictEqual([]);
    });
  });
});

describe('named import code fix (namedExports: true)', () => {
  describe('prioritizeNamedImports: false', () => {
    test('omits the named import code fix', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports: true, prioritizeNamedImports: false },
        }),
        'index.ts': `a_1;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const range = getRange('index.ts', 'a_1');
      const res = await tsserver.sendGetCodeFixes({
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        file: iff.paths['index.ts'],
        startLine: range.start.line,
        startOffset: range.start.offset,
        endLine: range.end.line,
        endOffset: range.end.offset,
      });

      expect(normalizeCodeFixActions(res.body!)).toStrictEqual([]);
    });
  });

  describe('prioritizeNamedImports: true', () => {
    test('omits the default styles binding code fix', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports: true, prioritizeNamedImports: true },
        }),
        'index.ts': `styles;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const range = getRange('index.ts', 'styles');
      const res = await tsserver.sendGetCodeFixes({
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        file: iff.paths['index.ts'],
        startLine: range.start.line,
        startOffset: range.start.offset,
        endLine: range.end.line,
        endOffset: range.end.offset,
      });

      expect(normalizeCodeFixActions(res.body!)).toStrictEqual([]);
    });

    test('suggests a named import code fix', async () => {
      const { iff, getRange } = await setupFixture({
        'tsconfig.json': buildTSConfigJSON({
          cmkOptions: { namedExports: true, prioritizeNamedImports: true },
        }),
        'index.ts': `a_1;`,
        'a.module.css': `.a_1 { color: red; }`,
      });
      await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

      const range = getRange('index.ts', 'a_1');
      const res = await tsserver.sendGetCodeFixes({
        errorCodes: [CANNOT_FIND_NAME_ERROR_CODE],
        file: iff.paths['index.ts'],
        startLine: range.start.line,
        startOffset: range.start.offset,
        endLine: range.end.line,
        endOffset: range.end.offset,
      });

      expect(normalizeCodeFixActions(res.body!)).toStrictEqual(
        normalizeCodeFixActions([
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
        ]),
      );
    });
  });
});
