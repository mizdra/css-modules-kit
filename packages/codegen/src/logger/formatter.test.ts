import { type SemanticDiagnostic, type SyntacticDiagnostic, SystemError } from '@css-modules-kit/core';
import { describe, expect, test } from 'vitest';
import { formatDiagnostic, formatSystemError } from './formatter';

// MEMO: Vitest overrides `process.stderr` with dummy stream without `hasColors` method. So, we need to add it.
process.stderr.hasColors = () => false;

const cwd = '/app';

describe('formatDiagnostic', () => {
  test('should format diagnostic without filename and start position', () => {
    const diagnostic: SemanticDiagnostic = { category: 'error', text: 'text' };
    const result = formatDiagnostic(diagnostic, cwd);
    expect(result).toMatchInlineSnapshot(`"error: text"`);
  });
  test('should format diagnostic with filename and start position', () => {
    const diagnostic: SyntacticDiagnostic = {
      file: { fileName: '/app/path/to/file.ts', text: 'abcdef' },
      start: { line: 1, column: 2 },
      category: 'error',
      text: 'text',
    };
    const result = formatDiagnostic(diagnostic, cwd);
    expect(result).toMatchInlineSnapshot(`"path/to/file.ts:1:2 - error: text"`);
  });
  test('should format diagnostic with error category', () => {
    const diagnostic: SemanticDiagnostic = {
      category: 'error',
      text: 'error text',
    };
    const result = formatDiagnostic(diagnostic, cwd);
    expect(result).toMatchInlineSnapshot(`"error: error text"`);
  });
  test('should format diagnostic with warning category', () => {
    const diagnostic: SemanticDiagnostic = {
      category: 'warning',
      text: 'warning text',
    };
    const result = formatDiagnostic(diagnostic, cwd);
    expect(result).toMatchInlineSnapshot(`"warning: warning text"`);
  });
});

test('formatSystemError', () => {
  expect(formatSystemError(new SystemError('CODE', 'message'))).toMatchInlineSnapshot(`"error CODE: message"`);
  const cause = new Error('msg2');
  expect(formatSystemError(new SystemError('CODE', 'msg1', cause))).toMatch(
    /error CODE: msg1\n {2}\[cause\]: Error: msg2\n {6}at .*/mu,
  );
});
