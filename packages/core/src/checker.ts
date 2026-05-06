import type { CMKConfig } from './config.js';
import type {
  CSSModule,
  Diagnostic,
  ExportRecord,
  Location,
  MatchesPattern,
  NamedTokenImporter,
  NamedTokenImporterSpecifier,
  Resolver,
  TokenImporter,
} from './type.js';
import { isURLSpecifier, type TokenNameViolation, validateTokenName } from './util.js';

export interface CheckerArgs {
  config: CMKConfig;
  getExportRecord: (cssModule: CSSModule) => ExportRecord;
  matchesPattern: MatchesPattern;
  resolver: Resolver;
  getCSSModule: (path: string) => CSSModule | undefined;
}

export function checkCSSModule(cssModule: CSSModule, args: CheckerArgs): Diagnostic[] {
  const { config } = args;
  const diagnostics: Diagnostic[] = [];

  for (const token of cssModule.localTokens) {
    // Reject special names as they may break .d.ts files
    const violation = validateTokenName(token.name, { namedExports: config.namedExports });
    if (violation) {
      diagnostics.push(createTokenNameDiagnostic(cssModule, token.loc, violation));
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

    if (tokenImporter.type === 'named') {
      const exportRecord = args.getExportRecord(imported);
      for (const specifier of tokenImporter.specifiers) {
        if (!exportRecord.allTokens.includes(specifier.name)) {
          diagnostics.push(createModuleHasNoExportedTokenDiagnostic(cssModule, tokenImporter, specifier));
        }
        const nameViolation = validateTokenName(specifier.name, { namedExports: config.namedExports });
        if (nameViolation) {
          diagnostics.push(createTokenNameDiagnostic(cssModule, specifier.loc, nameViolation));
        }
        if (specifier.localName) {
          const localNameViolation = validateTokenName(specifier.localName, { namedExports: config.namedExports });
          if (localNameViolation) {
            diagnostics.push(createTokenNameDiagnostic(cssModule, specifier.localLoc!, localNameViolation));
          }
        }
      }
    }
  }
  return diagnostics;
}

function createTokenNameDiagnostic(cssModule: CSSModule, loc: Location, violation: TokenNameViolation): Diagnostic {
  let text: string;
  switch (violation) {
    case 'proto-not-allowed':
      text = `\`__proto__\` is not allowed as names.`;
      break;
    case 'default-not-allowed':
      text = `\`default\` is not allowed as names when \`cmkOptions.namedExports\` is set to \`true\`.`;
      break;
    case 'backslash-not-allowed':
      text = `Backslash (\\) is not allowed in names.`;
      break;
    default:
      throw new Error('unreachable: unknown TokenNameViolation');
  }
  return {
    text,
    category: 'error',
    file: { fileName: cssModule.fileName, text: cssModule.text },
    start: { line: loc.start.line, column: loc.start.column },
    length: loc.end.offset - loc.start.offset,
  };
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
  tokenImporter: NamedTokenImporter,
  specifier: NamedTokenImporterSpecifier,
): Diagnostic {
  return {
    text: `Module '${tokenImporter.from}' has no exported token '${specifier.name}'.`,
    category: 'error',
    file: { fileName: cssModule.fileName, text: cssModule.text },
    start: { line: specifier.loc.start.line, column: specifier.loc.start.column },
    length: specifier.loc.end.offset - specifier.loc.start.offset,
  };
}
