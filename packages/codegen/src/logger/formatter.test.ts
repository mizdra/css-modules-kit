import dedent from 'dedent';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { formatDiagnostics } from './formatter';

describe('formatDiagnostics', () => {
  const file = ts.createSourceFile(
    '/app/test.module.css',
    dedent`
      .a_1 { color: red; }
      .a_2 { color: red; }
    `,
    ts.ScriptTarget.JSON,
    undefined,
    ts.ScriptKind.Unknown,
  );
  const host: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: () => '/app',
    getCanonicalFileName: (fileName) => fileName,
    getNewLine: () => '\n',
  };
  const diagnostics: ts.Diagnostic[] = [
    {
      file,
      start: 1,
      length: 3,
      messageText: '`a_1` is not allowed',
      category: ts.DiagnosticCategory.Error,
      code: 0,
    },
    {
      file,
      start: 22,
      length: 3,
      messageText: '`a_2` is not allowed',
      category: ts.DiagnosticCategory.Error,
      code: 0,
    },
  ];

  test('formats diagnostics with color and context when pretty is true', () => {
    const result = formatDiagnostics(diagnostics, host, true);
    expect(result).toMatchInlineSnapshot(`
      "[96mtest.module.css[0m:[93m1[0m:[93m2[0m - [91merror[0m[90m: [0m\`a_1\` is not allowed

      [7m1[0m .a_1 { color: red; }
      [7m [0m [91m ~~~[0m

      [96mtest.module.css[0m:[93m2[0m:[93m2[0m - [91merror[0m[90m: [0m\`a_2\` is not allowed

      [7m2[0m .a_2 { color: red; }
      [7m [0m [91m ~~~[0m

      "
    `);
  });

  test('formats diagnostics without color and context when pretty is false', () => {
    const result = formatDiagnostics(diagnostics, host, false);
    expect(result).toMatchInlineSnapshot(`
      "test.module.css(1,2): error: \`a_1\` is not allowed

      test.module.css(2,2): error: \`a_2\` is not allowed

      "
    `);
  });
});
