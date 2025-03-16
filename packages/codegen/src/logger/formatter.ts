import { inspect, styleText } from 'node:util';
import {
  type Diagnostic,
  type DiagnosticCategory,
  type DiagnosticPosition,
  relative,
  type SystemError,
} from '@css-modules-kit/core';

function shouldColorize(): boolean {
  return (
    !!process.env['FORCE_COLOR'] ||
    (!process.env['NO_COLORS'] && !process.env['NODE_DISABLE_COLORS'] && process.stderr.hasColors())
  );
}

export function formatDiagnostic(diagnostic: Diagnostic, cwd: string): string {
  let result = '';
  if ('file' in diagnostic) {
    result += `${formatLocation(diagnostic.file.fileName, diagnostic.start, cwd)} - `;
  }
  result += `${formatCategory(diagnostic.category)}: `;
  result += diagnostic.text;
  // TODO(#124): Add source code if diagnostics has a location
  return result;
}

export function formatSystemError(error: SystemError): string {
  let result = '';
  result += `${formatCategory('error')}`;
  result += ' ';
  result += styleText('gray', error.code);
  result += ': ';
  result += error.message;
  if (error.cause !== undefined) {
    result += '\n';
    result += `[cause]: ${inspect(error.cause, { colors: shouldColorize() })}`.replace(/^/gmu, '  ');
  }
  return result;
}

function formatLocation(fileName: string, start: DiagnosticPosition | undefined, cwd: string): string {
  let result = '';
  result += styleText('cyan', relative(cwd, fileName));
  if (start !== undefined) {
    result += ':';
    result += styleText('yellow', start.line.toString());
    result += ':';
    result += styleText('yellow', start.column.toString());
  }
  return result;
}

function formatCategory(category: DiagnosticCategory): string {
  switch (category) {
    case 'error':
      return styleText('red', 'error');
    case 'warning':
      return styleText('yellow', 'warning');
    default:
      throw new Error(`Unknown diagnostic category: ${String(category)}`);
  }
}
