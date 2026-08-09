import type {
  DiagnosticWithLocation,
  Location,
  NamedTokenImporterEntry,
  Token,
  TokenImporter,
  TokenReference,
} from '@css-modules-kit/core';
import {
  basename,
  CSS_MODULE_EXTENSION,
  isURLSpecifier,
  parseCSSModule,
  validateTokenName,
} from '@css-modules-kit/core';
import type { NormalizedMapperOptions } from './options.js';
import type { MapperDiagnostic, SpanMapping } from './protocol.js';
import { SpanMapFeature, SpanMapKind } from './protocol.js';

export interface TransformOutput {
  text: string;
  mappings: SpanMapping[];
  diagnostics: MapperDiagnostic[];
}

// The quotes around a generated token name have no counterpart in the CSS, so they are
// mapped as zero-width spans. Only definition-style features are enabled for them so that
// requests on the whole string literal still resolve to the token.
const QUOTE_FEATURES =
  SpanMapFeature.Definition |
  SpanMapFeature.TypeDefinition |
  SpanMapFeature.Implementation |
  SpanMapFeature.SourceDefinition |
  SpanMapFeature.References;

// Rename edits can only be written back through a Verbatim span, so alias spans exclude Rename.
const NON_RENAME_FEATURES = SpanMapFeature.All & ~SpanMapFeature.Rename;

function createTextBuilder() {
  let text = '';
  const mappings: SpanMapping[] = [];
  return {
    append(chunk: string): void {
      text += chunk;
    },
    /** Appends `'name'`, mapping the name to `loc` and the quotes to its boundaries. */
    appendTokenName(name: string, loc: Location): void {
      mappings.push([text.length, 1, loc.start.offset, 0, SpanMapKind.Atom, QUOTE_FEATURES]);
      mappings.push([text.length + 1, name.length, loc.start.offset, name.length, SpanMapKind.Verbatim]);
      mappings.push([text.length + 1 + name.length, 1, loc.end.offset, 0, SpanMapKind.Atom, QUOTE_FEATURES]);
      text += `'${name}'`;
    },
    /** Appends the quoted specifier, mapping it (quotes included) to the original. */
    appendSpecifier(from: string, fromLoc: Location, quote: string): void {
      mappings.push([text.length, from.length + 2, fromLoc.start.offset - 1, from.length + 2, SpanMapKind.Verbatim]);
      text += `${quote}${from}${quote}`;
    },
    /** Appends `name`, mapping it to `loc` as an alias of the original name. */
    appendAlias(name: string, loc: Location): void {
      mappings.push([
        text.length,
        name.length,
        loc.start.offset,
        loc.end.offset - loc.start.offset,
        SpanMapKind.Alias,
        NON_RENAME_FEATURES,
      ]);
      text += name;
    },
    build(): { text: string; mappings: SpanMapping[] } {
      return { text, mappings };
    },
  };
}

type TextBuilder = ReturnType<typeof createTextBuilder>;

function isValidTokenName(name: string, options: NormalizedMapperOptions): boolean {
  return validateTokenName(name, { namedExports: options.namedExports }) === undefined;
}

function isValidEntry(entry: NamedTokenImporterEntry, options: NormalizedMapperOptions): boolean {
  return (
    isValidTokenName(entry.name, options) &&
    (entry.localName === undefined || isValidTokenName(entry.localName, options))
  );
}

/** Specifiers that resolve to other CSS Modules. URL imports and plain CSS imports are left to bundlers. */
function isImportableSpecifier(from: string): boolean {
  return !isURLSpecifier(from) && from.endsWith(CSS_MODULE_EXTENSION);
}

/** Verbatim mapping requires identical text, so the generated specifier reuses the original quote character. */
function specifierQuote(content: string, fromLoc: Location): string {
  const quote = content[fromLoc.start.offset - 1];
  return quote === '"' ? '"' : "'";
}

/**
 * Transforms a CSS Module into TypeScript text for the content mapper protocol.
 * The generated text delegates most validation to the TypeScript checker: importing a
 * missing file or referencing a missing token becomes an ordinary type error, which tsgo
 * maps back to the CSS through the returned span mappings.
 */
export function transformCSSModule(
  fileName: string,
  content: string,
  options: NormalizedMapperOptions,
): TransformOutput {
  const cssModule = parseCSSModule(content, {
    fileName,
    includeSyntaxError: true,
    animation: options.animation,
    dashedIdents: options.dashedIdents,
    container: options.container,
    namedExports: options.namedExports,
  });
  const localTokens = cssModule.localTokens.filter((token) => isValidTokenName(token.name, options));
  const tokenImporters = cssModule.tokenImporters
    .filter((tokenImporter) => isImportableSpecifier(tokenImporter.from))
    .map((tokenImporter) =>
      tokenImporter.type === 'named'
        ? { ...tokenImporter, entries: tokenImporter.entries.filter((entry) => isValidEntry(entry, options)) }
        : tokenImporter,
    );
  const tokenReferences = cssModule.tokenReferences
    .map((reference) =>
      reference.type === 'external'
        ? { ...reference, entries: reference.entries.filter((entry) => isValidTokenName(entry.name, options)) }
        : reference,
    )
    .filter((reference) =>
      reference.type === 'local'
        ? isValidTokenName(reference.name, options)
        : isImportableSpecifier(reference.from) && reference.entries.length > 0,
    );
  const { text, mappings } = options.namedExports
    ? buildNamedExportsText(
        fileName,
        content,
        localTokens,
        tokenImporters,
        tokenReferences,
        options.prioritizeNamedImports,
      )
    : buildDefaultExportText(content, localTokens, tokenImporters, tokenReferences);
  return { text, mappings, diagnostics: convertDiagnostics(cssModule.diagnostics, content) };
}

function buildDefaultExportText(
  content: string,
  localTokens: Token[],
  tokenImporters: TokenImporter[],
  tokenReferences: TokenReference[],
): { text: string; mappings: SpanMapping[] } {
  const builder = createTextBuilder();
  const importerBindings = new Map<TokenImporter, string>();
  const referenceBindings = new Map<TokenReference, string>();
  let importCount = 0;
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type === 'all' || tokenImporter.entries.length > 0) {
      const binding = `_import_${importCount++}`;
      importerBindings.set(tokenImporter, binding);
      builder.append(`import * as ${binding} from `);
    } else {
      // A side-effect import keeps module resolution errors even when no entry is usable.
      builder.append('import ');
    }
    appendImportSpecifier(builder, content, tokenImporter);
  }
  for (const reference of tokenReferences) {
    if (reference.type !== 'external') continue;
    const binding = `_import_${importCount++}`;
    referenceBindings.set(reference, binding);
    builder.append(`import * as ${binding} from `);
    appendImportSpecifier(builder, content, reference);
  }
  const allImporters = tokenImporters.filter((tokenImporter) => tokenImporter.type === 'all');
  if (allImporters.length > 0) {
    // Maps an `any`-typed module (e.g. an unresolvable import) to `{}` so that it does not
    // absorb the other intersection members.
    builder.append('type __BlockErrorType<T> = [0] extends [1 & T] ? {} : T;\n');
  }
  // Each token occurrence gets its own interface declaration so that duplicated names
  // merge instead of colliding, while every occurrence stays a declaration.
  let hasMembers = false;
  for (const token of localTokens) {
    builder.append('interface Styles { readonly ');
    builder.appendTokenName(token.name, token.loc);
    builder.append(': string; }\n');
    hasMembers = true;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type !== 'named') continue;
    const binding = importerBindings.get(tokenImporter)!;
    for (const entry of tokenImporter.entries) {
      builder.append('interface Styles { readonly ');
      builder.appendTokenName(entry.localName ?? entry.name, entry.localLoc ?? entry.loc);
      builder.append(`: typeof ${binding}.default[`);
      builder.appendTokenName(entry.name, entry.loc);
      builder.append(']; }\n');
      hasMembers = true;
    }
  }
  if (!hasMembers) builder.append('interface Styles {}\n');
  builder.append('declare const styles: Styles');
  for (const allImporter of allImporters) {
    builder.append(` & __BlockErrorType<typeof ${importerBindings.get(allImporter)!}.default>`);
  }
  builder.append(';\n');
  for (const reference of tokenReferences) {
    if (reference.type === 'local') {
      builder.append('styles[');
      builder.appendTokenName(reference.name, reference.loc);
      builder.append('];\n');
    } else {
      const binding = referenceBindings.get(reference)!;
      for (const entry of reference.entries) {
        builder.append(`${binding}.default[`);
        builder.appendTokenName(entry.name, entry.loc);
        builder.append('];\n');
      }
    }
  }
  builder.append('export default styles;\n');
  return builder.build();
}

function buildNamedExportsText(
  fileName: string,
  content: string,
  localTokens: Token[],
  tokenImporters: TokenImporter[],
  tokenReferences: TokenReference[],
  prioritizeNamedImports: boolean,
): { text: string; mappings: SpanMapping[] } {
  const builder = createTextBuilder();
  let isModule = false;
  const groups = Object.groupBy(localTokens, (token) => token.name);
  for (const [index, [name, tokens]] of Object.entries(groups).entries()) {
    if (tokens === undefined) continue;
    const alias = `_token_${index}`;
    for (const token of tokens) {
      builder.append('var ');
      builder.appendAlias(alias, token.loc);
      builder.append(': string;\n');
    }
    builder.append(`export { ${alias} as `);
    builder.appendTokenName(name, tokens[0]!.loc);
    builder.append(' };\n');
    isModule = true;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type === 'all') {
      builder.append('export * from ');
    } else {
      builder.append('export {\n');
      for (const entry of tokenImporter.entries) {
        builder.append('  ');
        builder.appendTokenName(entry.name, entry.loc);
        builder.append(' as ');
        builder.appendTokenName(entry.localName ?? entry.name, entry.localLoc ?? entry.loc);
        builder.append(',\n');
      }
      builder.append('} from ');
    }
    appendImportSpecifier(builder, content, tokenImporter);
    isModule = true;
  }
  const referenceBindings = new Map<TokenReference, string>();
  let importCount = 0;
  for (const reference of tokenReferences) {
    if (reference.type !== 'external') continue;
    const binding = `_import_${importCount++}`;
    referenceBindings.set(reference, binding);
    builder.append(`import * as ${binding} from `);
    appendImportSpecifier(builder, content, reference);
    isModule = true;
  }
  if (tokenReferences.some((reference) => reference.type === 'local')) {
    builder.append(`declare const __self: typeof import('./${basename(fileName)}');\n`);
  }
  for (const reference of tokenReferences) {
    if (reference.type === 'local') {
      builder.append('__self[');
      builder.appendTokenName(reference.name, reference.loc);
      builder.append('];\n');
    } else {
      const binding = referenceBindings.get(reference)!;
      for (const entry of reference.entries) {
        builder.append(`${binding}[`);
        builder.appendTokenName(entry.name, entry.loc);
        builder.append('];\n');
      }
    }
  }
  if (!prioritizeNamedImports) {
    builder.append('declare const styles: {};\nexport default styles;\n');
    isModule = true;
  }
  if (!isModule) builder.append('export {};\n');
  return builder.build();
}

function appendImportSpecifier(
  builder: TextBuilder,
  content: string,
  importer: { from: string; fromLoc: Location },
): void {
  builder.appendSpecifier(importer.from, importer.fromLoc, specifierQuote(content, importer.fromLoc));
  builder.append(';\n');
}

function convertDiagnostics(diagnostics: DiagnosticWithLocation[], content: string): MapperDiagnostic[] {
  return diagnostics
    .filter((diagnostic) => diagnostic.category === 'error')
    .map((diagnostic) => ({
      messageText: diagnostic.text,
      start: toOffset(content, diagnostic.start.line, diagnostic.start.column),
      length: diagnostic.length,
    }));
}

/** Converts a 1-based line/column position into a UTF-16 offset. */
function toOffset(text: string, line: number, column: number): number {
  let lineStart = 0;
  for (let currentLine = 1; currentLine < line; currentLine++) {
    const newlineIndex = text.indexOf('\n', lineStart);
    if (newlineIndex === -1) break;
    lineStart = newlineIndex + 1;
  }
  return Math.min(lineStart + column - 1, text.length);
}
