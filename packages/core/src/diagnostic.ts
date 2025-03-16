import ts from 'typescript';
import type { Diagnostic, DiagnosticSourceFile, DiagnosticWithLocation } from './type.js';

/** The error code used by tsserver to display the css-modules-kit error in the editor. */
// NOTE: Use any other number than 1002 or later, as they are reserved by TypeScript's built-in errors.
// ref: https://github.com/microsoft/TypeScript/blob/220706eb0320ff46fad8bf80a5e99db624ee7dfb/src/compiler/diagnosticMessages.json
const TS_ERROR_CODE_FOR_CMK_ERROR = 0;

function convertErrorCategory(category: 'error' | 'warning' | 'suggestion'): ts.DiagnosticCategory {
  switch (category) {
    case 'error':
      return ts.DiagnosticCategory.Error;
    case 'warning':
      return ts.DiagnosticCategory.Warning;
    case 'suggestion':
      return ts.DiagnosticCategory.Suggestion;
    default:
      throw new Error(`Unknown category: ${String(category)}`);
  }
}

export function convertDiagnostic(
  diagnostic: Diagnostic,
  getSourceFile: (file: DiagnosticSourceFile) => ts.SourceFile,
): ts.Diagnostic {
  if ('file' in diagnostic) {
    return convertDiagnosticWithLocation(diagnostic, getSourceFile);
  } else {
    return {
      file: undefined,
      start: undefined,
      length: undefined,
      category: convertErrorCategory(diagnostic.category),
      messageText: diagnostic.text,
      code: TS_ERROR_CODE_FOR_CMK_ERROR,
    };
  }
}

export function convertDiagnosticWithLocation(
  diagnostic: DiagnosticWithLocation,
  getSourceFile: (file: DiagnosticSourceFile) => ts.SourceFile,
): ts.DiagnosticWithLocation {
  const sourceFile = getSourceFile(diagnostic.file);
  const start = ts.getPositionOfLineAndCharacter(sourceFile, diagnostic.start.line - 1, diagnostic.start.column - 1);
  return {
    file: sourceFile,
    start,
    length: diagnostic.length,
    category: convertErrorCategory(diagnostic.category),
    messageText: diagnostic.text,
    code: TS_ERROR_CODE_FOR_CMK_ERROR,
  };
}
