import { type SemanticDiagnostic, type SyntacticDiagnostic, SystemError } from '@css-modules-kit/core';
import { describe, expect, test } from 'vitest';
import { formatDiagnostic, formatSystemError } from './formatter';

const cwd = '/app';

describe('formatDiagnostic', () => {
  test('should format diagnostic without filename and start position', () => {
    const diagnostic: SemanticDiagnostic = { type: 'semantic', category: 'error', text: 'text' };
    const result = formatDiagnostic(diagnostic, cwd);
    expect(result).toMatchInlineSnapshot(`"error: text"`);
  });
  test('should format diagnostic with filename and start position', () => {
    const diagnostic: SyntacticDiagnostic = {
      type: 'syntactic',
      fileName: '/app/path/to/file.ts',
      start: { line: 1, column: 2 },
      category: 'error',
      text: 'text',
    };
    const result = formatDiagnostic(diagnostic, cwd);
    expect(result).toMatchInlineSnapshot(`"path/to/file.ts:1:2 - error: text"`);
  });
  test('should format diagnostic with error category', () => {
    const diagnostic: SemanticDiagnostic = {
      type: 'semantic',
      category: 'error',
      text: 'error text',
    };
    const result = formatDiagnostic(diagnostic, cwd);
    expect(result).toMatchInlineSnapshot(`"error: error text"`);
  });
  test('should format diagnostic with warning category', () => {
    const diagnostic: SemanticDiagnostic = {
      type: 'semantic',
      category: 'warning',
      text: 'warning text',
    };
    const result = formatDiagnostic(diagnostic, cwd);
    expect(result).toMatchInlineSnapshot(`"warning: warning text"`);
  });
});

test('formatSystemError', () => {
  expect(formatSystemError(new SystemError('CODE', 'message'))).toMatchInlineSnapshot(`"error CODE: message"`);
});
