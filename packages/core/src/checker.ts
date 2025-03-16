import type { ExportBuilder } from './export-builder.js';
import type { MatchesPattern } from './file.js';
import type { Resolver } from './resolver.js';
import type { AtValueTokenImporter, AtValueTokenImporterValue, CSSModule, TokenImporter } from './type.js';
import type { SemanticDiagnostic } from './type.js';

export function checkCSSModule(
  cssModule: CSSModule,
  exportBuilder: ExportBuilder,
  matchesPattern: MatchesPattern,
  resolver: Resolver,
  getCSSModule: (path: string) => CSSModule | undefined,
): SemanticDiagnostic[] {
  const diagnostics: SemanticDiagnostic[] = [];

  for (const tokenImporter of cssModule.tokenImporters) {
    const from = resolver(tokenImporter.from, { request: cssModule.fileName });
    if (!from || !matchesPattern(from)) continue;
    const imported = getCSSModule(from);
    if (!imported) {
      diagnostics.push(createCannotImportModuleDiagnostic(cssModule, tokenImporter));
      continue;
    }

    if (tokenImporter.type === 'value') {
      const exportRecord = exportBuilder.build(imported);
      for (const value of tokenImporter.values) {
        if (!exportRecord.allTokens.includes(value.name)) {
          diagnostics.push(createModuleHasNoExportedTokenDiagnostic(cssModule, tokenImporter, value));
        }
      }
    }
  }
  return diagnostics;
}

function createCannotImportModuleDiagnostic(cssModule: CSSModule, tokenImporter: TokenImporter): SemanticDiagnostic {
  return {
    text: `Cannot import module '${tokenImporter.from}'`,
    category: 'error',
    fileName: cssModule.fileName,
    start: { line: tokenImporter.fromLoc.start.line, column: tokenImporter.fromLoc.start.column },
    end: { line: tokenImporter.fromLoc.end.line, column: tokenImporter.fromLoc.end.column },
  };
}

function createModuleHasNoExportedTokenDiagnostic(
  cssModule: CSSModule,
  tokenImporter: AtValueTokenImporter,
  value: AtValueTokenImporterValue,
): SemanticDiagnostic {
  return {
    text: `Module '${tokenImporter.from}' has no exported token '${value.name}'.`,
    category: 'error',
    fileName: cssModule.fileName,
    start: { line: value.loc.start.line, column: value.loc.start.column },
    end: { line: value.loc.end.line, column: value.loc.end.column },
  };
}
