import type { Diagnostic, SystemError } from '@css-modules-kit/core';
import { formatDiagnostic, formatSystemError } from './formatter.js';

export interface Logger {
  logDiagnostics(diagnostics: Diagnostic[]): void;
  logSystemError(error: SystemError): void;
  logMessage(message: string): void;
}

export function createLogger(cwd: string, pretty: boolean): Logger {
  return {
    logDiagnostics(diagnostics: Diagnostic[]): void {
      let result = '';
      for (const diagnostic of diagnostics) {
        result += `${formatDiagnostic(diagnostic, cwd, pretty)}\n\n`;
      }
      process.stderr.write(result);
    },
    logSystemError(error: SystemError): void {
      process.stderr.write(`${formatSystemError(error, pretty)}\n`);
    },
    logMessage(message: string): void {
      process.stdout.write(`${message}\n`);
    },
  };
}
