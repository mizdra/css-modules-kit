import ts from 'typescript';
import type { SystemError } from './error.js';
import type { Diagnostic, DiagnosticCategory, DiagnosticSourceFile, DiagnosticWithLocation } from './type.js';

/** The error code used by tsserver to display the css-modules-kit error in the editor. */
const TS_ERROR_CODE = 0;

const TS_ERROR_SOURCE = 'css-modules-kit';

function convertErrorCategory(category: DiagnosticCategory): ts.DiagnosticCategory {
  switch (category) {
    case 'error':
      return ts.DiagnosticCategory.Error;
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
      code: TS_ERROR_CODE,
      source: TS_ERROR_SOURCE,
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
    code: TS_ERROR_CODE,
    source: TS_ERROR_SOURCE,
  };
}

export function convertSystemError(systemError: SystemError): ts.Diagnostic {
  let messageText = systemError.message;
  if (systemError.cause) {
    if (systemError.cause instanceof Error) {
      messageText += `: ${systemError.cause.message}`;
    } else {
      messageText += `: ${JSON.stringify(systemError.cause)}`;
    }
  }
  return {
    file: undefined,
    start: undefined,
    length: undefined,
    category: ts.DiagnosticCategory.Error,
    messageText,
    code: TS_ERROR_CODE,
    source: TS_ERROR_SOURCE,
  };
}
