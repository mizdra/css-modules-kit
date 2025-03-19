import ts from 'typescript';

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
