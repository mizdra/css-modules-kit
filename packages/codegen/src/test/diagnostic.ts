import type { Diagnostic } from '@css-modules-kit/core';

function formatDiagnostic(diagnostic: Diagnostic, rootDir: string) {
  return {
    text: diagnostic.text.replace(rootDir, '<rootDir>'),
    category: diagnostic.category,
    ...('file' in diagnostic ?
      {
        fileName: diagnostic.file.fileName.replace(rootDir, '<rootDir>'),
        start: diagnostic.start,
        length: diagnostic.length,
      }
    : {}),
  };
}
export function formatDiagnostics(diagnostics: Diagnostic[], rootDir: string) {
  return diagnostics.map((diagnostic) => formatDiagnostic(diagnostic, rootDir));
}
