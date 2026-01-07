import type { CMKConfig } from './config.js';
import type {
  AtValueTokenImporter,
  AtValueTokenImporterValue,
  CSSModule,
  Diagnostic,
  ExportBuilder,
  Location,
  MatchesPattern,
  Resolver,
} from './type.js';
import { isValidAsJSIdentifier } from './util.js';

// eslint-disable-next-line max-params, complexity
export function checkCSSModule(
  cssModule: CSSModule,
  config: CMKConfig,
  exportBuilder: ExportBuilder,
  matchesPattern: MatchesPattern,
  resolver: Resolver,
  getCSSModule: (path: string) => CSSModule | undefined,
): Diagnostic[] {
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
    const from = resolver(tokenImporter.from, { request: cssModule.fileName });
    if (!from || !matchesPattern(from)) continue;
    const imported = getCSSModule(from);
    if (!imported) continue;

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
