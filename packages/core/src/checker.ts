import type {
  CSSModule,
  Diagnostic,
  ExportRecord,
  Location,
  LocalTokenReference,
  MatchesPattern,
  Resolver,
} from './type.js';
import { isURLSpecifier } from './util.js';

export interface CheckerArgs {
  getExportRecord: (cssModule: CSSModule) => ExportRecord;
  matchesPattern: MatchesPattern;
  resolver: Resolver;
  getCSSModule: (path: string) => CSSModule | undefined;
}

export function checkCSSModule(cssModule: CSSModule, args: CheckerArgs): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const tokenImporter of cssModule.tokenImporters) {
    if (isURLSpecifier(tokenImporter.from)) continue;
    const from = args.resolver(tokenImporter.from, { request: cssModule.fileName });
    if (!from) {
      diagnostics.push(createCannotImportModuleDiagnostic(cssModule, tokenImporter.from, tokenImporter.fromLoc));
      continue;
    }
    if (!args.matchesPattern(from)) continue;
    const imported = args.getCSSModule(from);
    if (!imported) throw new Error('unreachable: `imported` is undefined');

    if (tokenImporter.type === 'named') {
      const exportRecord = args.getExportRecord(imported);
      for (const entry of tokenImporter.entries) {
        if (!exportRecord.allTokens.includes(entry.name)) {
          diagnostics.push(
            createModuleHasNoExportedTokenDiagnostic(cssModule, tokenImporter.from, entry.name, entry.loc),
          );
        }
      }
    }
  }

  const exportRecord = args.getExportRecord(cssModule);
  for (const reference of cssModule.tokenReferences) {
    if (reference.type === 'local') {
      if (!exportRecord.allTokens.includes(reference.name)) {
        diagnostics.push(createTokenNotFoundDiagnostic(cssModule, reference));
      }
      continue;
    }
    // Unlike `@import`, URL specifiers are not skipped because css-loader fails to resolve them in `composes`.
    const from = args.resolver(reference.from, { request: cssModule.fileName });
    if (!from) {
      diagnostics.push(createCannotImportModuleDiagnostic(cssModule, reference.from, reference.fromLoc));
      continue;
    }
    if (!args.matchesPattern(from)) continue;
    const imported = args.getCSSModule(from);
    if (!imported) throw new Error('unreachable: `imported` is undefined');
    const importedExportRecord = args.getExportRecord(imported);
    for (const entry of reference.entries) {
      if (!importedExportRecord.allTokens.includes(entry.name)) {
        diagnostics.push(createModuleHasNoExportedTokenDiagnostic(cssModule, reference.from, entry.name, entry.loc));
      }
    }
  }
  return diagnostics;
}

function createCannotImportModuleDiagnostic(cssModule: CSSModule, from: string, fromLoc: Location): Diagnostic {
  return {
    text: `Cannot import module '${from}'`,
    category: 'error',
    file: { fileName: cssModule.fileName, text: cssModule.text },
    start: { line: fromLoc.start.line, column: fromLoc.start.column },
    length: fromLoc.end.offset - fromLoc.start.offset,
  };
}

function createModuleHasNoExportedTokenDiagnostic(
  cssModule: CSSModule,
  from: string,
  name: string,
  loc: Location,
): Diagnostic {
  return {
    text: `Module '${from}' has no exported token '${name}'.`,
    category: 'error',
    file: { fileName: cssModule.fileName, text: cssModule.text },
    start: { line: loc.start.line, column: loc.start.column },
    length: loc.end.offset - loc.start.offset,
  };
}

function createTokenNotFoundDiagnostic(cssModule: CSSModule, reference: LocalTokenReference): Diagnostic {
  return {
    text: `Cannot find token '${reference.name}'.`,
    category: 'error',
    file: { fileName: cssModule.fileName, text: cssModule.text },
    start: { line: reference.loc.start.line, column: reference.loc.start.column },
    length: reference.loc.end.offset - reference.loc.start.offset,
  };
}
