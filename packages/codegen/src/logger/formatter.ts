import ts from 'typescript';

const GRAY = '\u001b[90m';
const RESET = '\u001b[0m';

export function formatDiagnostics(
  diagnostics: ts.Diagnostic[],
  host: ts.FormatDiagnosticsHost,
  pretty: boolean,
): string {
  const format = pretty ? ts.formatDiagnosticsWithColorAndContext : ts.formatDiagnostics;
  let result = '';
  for (const diagnostic of diagnostics) {
    result += format([diagnostic], host).replace(` TS${diagnostic.code}`, '') + host.getNewLine();
  }
  return result;
}

export function formatTime(date: Date, pretty: boolean): string {
  const text = date.toLocaleTimeString('en-US', { timeZone: 'UTC' });
  if (pretty) {
    return `[${GRAY}${text}${RESET}]`;
  } else {
    return `[${text}]`;
  }
}
