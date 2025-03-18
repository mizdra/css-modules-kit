import { inspect, styleText } from 'node:util';
import {
  type Diagnostic,
  type DiagnosticCategory,
  type DiagnosticPosition,
  relative,
  type SystemError,
} from '@css-modules-kit/core';
import { shouldBePretty } from './typescript.js';

function color(color: Parameters<typeof styleText>[0], text: string, pretty: boolean): string {
  return pretty ? styleText(color, text) : text;
}

export function formatDiagnostic(diagnostic: Diagnostic, cwd: string): string {
  const pretty = shouldBePretty(undefined);
  let result = '';
  if ('file' in diagnostic) {
    result += `${formatLocation(diagnostic.file.fileName, diagnostic.start, cwd, pretty)} - `;
  }
  result += `${formatCategory(diagnostic.category, pretty)}: `;
  result += diagnostic.text;
  // TODO(#124): Add source code if diagnostics has a location
  return result;
}

export function formatSystemError(error: SystemError): string {
  const pretty = shouldBePretty(undefined);
  let result = '';
  result += `${formatCategory('error', pretty)}`;
  result += ' ';
  result += color('gray', error.code, pretty);
  result += ': ';
  result += error.message;
  if (error.cause !== undefined) {
    result += '\n';
    result += `[cause]: ${inspect(error.cause, { colors: pretty })}`.replace(/^/gmu, '  ');
  }
  return result;
}

function formatLocation(fileName: string, start: DiagnosticPosition | undefined, cwd: string, pretty: boolean): string {
  let result = '';
  result += color('cyan', relative(cwd, fileName), pretty);
  if (start !== undefined) {
    result += ':';
    result += color('yellow', start.line.toString(), pretty);
    result += ':';
    result += color('yellow', start.column.toString(), pretty);
  }
  return result;
}

function formatCategory(category: DiagnosticCategory, pretty: boolean): string {
  switch (category) {
    case 'error':
      return color('red', 'error', pretty);
    case 'warning':
      return color('yellow', 'warning', pretty);
    default:
      throw new Error(`Unknown diagnostic category: ${String(category)}`);
  }
}
