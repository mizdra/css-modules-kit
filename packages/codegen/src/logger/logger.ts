import { inspect } from 'node:util';
import type { DiagnosticSourceFile } from '@css-modules-kit/core';
import { convertDiagnostic, convertSystemError, type Diagnostic, SystemError } from '@css-modules-kit/core';
import ts from 'typescript';
import { formatDiagnostics, formatTime } from './formatter.js';

export interface Logger {
  logDiagnostics(diagnostics: Diagnostic[]): void;
  logError(error: unknown): void;
  logMessage(message: string, options?: { time?: boolean }): void;
  clearScreen(): void;
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
    logError(error: unknown): void {
      // NOTE: SystemErrors are errors expected by the css-modules-kit specification and may occur within normal usage.
      // These errors are formatted clearly and concisely. No stack trace is output.
      //
      // All other errors are unexpected errors. To assist in debugging when these errors occur, a stack trace is output.
      if (error instanceof SystemError) {
        const result = formatDiagnostics([convertSystemError(error)], host, pretty);
        process.stderr.write(result);
      } else {
        process.stderr.write(`${inspect(error, { colors: pretty })}\n`);
      }
    },
    logMessage(message: string, options?: { time?: boolean }): void {
      const header = options?.time ? `${formatTime(new Date(), pretty)} ` : '';
      process.stdout.write(`${header}${message}\n`);
    },
    clearScreen(): void {
      process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
    },
  };
}
