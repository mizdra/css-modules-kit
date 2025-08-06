import type {
  AtValueTokenImporter,
  AtValueTokenImporterValue,
  CSSModule,
  Diagnostic,
  ExportBuilder,
  Location,
  MatchesPattern,
  Resolver,
  TokenImporter,
} from './type.js';
import { isValidAsJSIdentifier } from './util.js';

export function checkCSSModule(
  cssModule: CSSModule,
  exportBuilder: ExportBuilder,
  matchesPattern: MatchesPattern,
  resolver: Resolver,
  getCSSModule: (path: string) => CSSModule | undefined,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const token of cssModule.localTokens) {
    if (!isValidAsJSIdentifier(token.name)) {
      diagnostics.push(createInvalidNameAsJSIdentifiersDiagnostic(cssModule, token.loc));
    }
  }

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
        if (!isValidAsJSIdentifier(value.name)) {
          diagnostics.push(createInvalidNameAsJSIdentifiersDiagnostic(cssModule, value.loc));
        }
        if (value.localName && !isValidAsJSIdentifier(value.localName)) {
          diagnostics.push(createInvalidNameAsJSIdentifiersDiagnostic(cssModule, value.localLoc!));
        }
      }
    }
  }
  return diagnostics;
}

function createCannotImportModuleDiagnostic(cssModule: CSSModule, tokenImporter: TokenImporter): Diagnostic {
  return {
    text: `Cannot import module '${tokenImporter.from}'`,
    category: 'error',
    file: { fileName: cssModule.fileName, text: cssModule.text },
    start: { line: tokenImporter.fromLoc.start.line, column: tokenImporter.fromLoc.start.column },
    length: tokenImporter.fromLoc.end.offset - tokenImporter.fromLoc.start.offset,
  };
}

function createModuleHasNoExportedTokenDiagnostic(
  cssModule: CSSModule,
  tokenImporter: AtValueTokenImporter,
  value: AtValueTokenImporterValue,
): Diagnostic {
  return {
    text: `Module '${tokenImporter.from}' has no exported token '${value.name}'.`,
    category: 'error',
    file: { fileName: cssModule.fileName, text: cssModule.text },
    start: { line: value.loc.start.line, column: value.loc.start.column },
    length: value.loc.end.offset - value.loc.start.offset,
  };
}

function createInvalidNameAsJSIdentifiersDiagnostic(cssModule: CSSModule, loc: Location): Diagnostic {
  return {
    text: `css-modules-kit does not support invalid names as JavaScript identifiers.`,
    category: 'error',
    file: { fileName: cssModule.fileName, text: cssModule.text },
    start: { line: loc.start.line, column: loc.start.column },
    length: loc.end.offset - loc.start.offset,
  };
}
