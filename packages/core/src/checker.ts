import type { CMKConfig } from './config.js';
import type {
  AtValueTokenImporter,
  AtValueTokenImporterValue,
  CSSModule,
  Diagnostic,
  ExportRecord,
  Location,
  MatchesPattern,
  Resolver,
  TokenImporter,
} from './type.js';
import { isURLSpecifier, isValidAsJSIdentifier } from './util.js';

export interface CheckerArgs {
  config: CMKConfig;
  getExportRecord: (cssModule: CSSModule) => ExportRecord;
  matchesPattern: MatchesPattern;
  resolver: Resolver;
  getCSSModule: (path: string) => CSSModule | undefined;
}

// eslint-disable-next-line complexity
export function checkCSSModule(cssModule: CSSModule, args: CheckerArgs): Diagnostic[] {
  const { config } = args;
  const diagnostics: Diagnostic[] = [];

  for (const token of cssModule.localTokens) {
    // Reject special names as they may break .d.ts files
    if (!isValidAsJSIdentifier(token.name)) {
      diagnostics.push(createInvalidNameAsJSIdentifiersDiagnostic(cssModule, token.loc));
    }
    if (token.name === '__proto__') {
      diagnostics.push(createProtoIsNotAllowedDiagnostic(cssModule, token.loc));
    }
    if (config.namedExports && token.name === 'default') {
      diagnostics.push(createDefaultIsNotAllowedDiagnostic(cssModule, token.loc));
    }
  }

  for (const tokenImporter of cssModule.tokenImporters) {
    if (isURLSpecifier(tokenImporter.from)) continue;
    const from = args.resolver(tokenImporter.from, { request: cssModule.fileName });
    if (!from) {
      diagnostics.push(createCannotImportModuleDiagnostic(cssModule, tokenImporter));
      continue;
    }
    if (!args.matchesPattern(from)) continue;
    const imported = args.getCSSModule(from);
    if (!imported) throw new Error('unreachable: `imported` is undefined');

    if (tokenImporter.type === 'value') {
      const exportRecord = args.getExportRecord(imported);
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
        if (value.name === '__proto__') {
          diagnostics.push(createProtoIsNotAllowedDiagnostic(cssModule, value.loc));
        }
        if (value.localName === '__proto__') {
          diagnostics.push(createProtoIsNotAllowedDiagnostic(cssModule, value.localLoc!));
        }
        if (config.namedExports) {
          if (value.name === 'default') {
            diagnostics.push(createDefaultIsNotAllowedDiagnostic(cssModule, value.loc));
          }
          if (value.localName === 'default') {
            diagnostics.push(createDefaultIsNotAllowedDiagnostic(cssModule, value.localLoc!));
          }
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

function createProtoIsNotAllowedDiagnostic(cssModule: CSSModule, loc: Location): Diagnostic {
  return {
    text: `\`__proto__\` is not allowed as names.`,
    category: 'error',
    file: { fileName: cssModule.fileName, text: cssModule.text },
    start: { line: loc.start.line, column: loc.start.column },
    length: loc.end.offset - loc.start.offset,
  };
}

function createDefaultIsNotAllowedDiagnostic(cssModule: CSSModule, loc: Location): Diagnostic {
  return {
    text: `\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.`,
    category: 'error',
    file: { fileName: cssModule.fileName, text: cssModule.text },
    start: { line: loc.start.line, column: loc.start.column },
    length: loc.end.offset - loc.start.offset,
  };
}
