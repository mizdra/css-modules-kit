import type { DiagnosticSourceFile } from '@css-modules-kit/core';
import { convertDiagnostic, convertSystemError, type Diagnostic, type SystemError } from '@css-modules-kit/core';
import ts from 'typescript';
import { formatDiagnostics } from './formatter.js';

export interface Logger {
  logDiagnostics(diagnostics: Diagnostic[]): void;
  logSystemError(error: SystemError): void;
  logMessage(message: string): void;
}

export function createLogger(cwd: string, pretty: boolean): Logger {
  const host: ts.FormatDiagnosticsHost = {
    getCurrentDirectory: () => cwd,
    getCanonicalFileName: (fileName) => (ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase()),
    getNewLine: () => ts.sys.newLine,
  };

  function getSourceFile(file: DiagnosticSourceFile): ts.SourceFile {
    return ts.createSourceFile(file.fileName, file.text, ts.ScriptTarget.JSON, undefined, ts.ScriptKind.Unknown);
  }

  return {
    logDiagnostics(diagnostics: Diagnostic[]): void {
      const result = formatDiagnostics(
        diagnostics.map((d) => convertDiagnostic(d, getSourceFile)),
        host,
        pretty,
      );
      process.stderr.write(result);
    },
    logSystemError(error: SystemError): void {
      const result = formatDiagnostics([convertSystemError(error)], host, pretty);
      process.stderr.write(result);
    },
    logMessage(message: string): void {
      process.stdout.write(`${message}\n`);
    },
  };
}
