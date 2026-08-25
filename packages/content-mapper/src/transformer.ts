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
  isCSSModuleFile,
  isURLSpecifier,
  parseCSSModule,
  validateTokenName,
} from '@css-modules-kit/core';
import type { NormalizedMapperOptions } from './options.js';
import type { DiagnosticDirectives, MapperDiagnostic, MappedDiagnosticDirective, SpanMapping } from './protocol.js';
import { DiagnosticDirectivePolicy, SpanMapFeature, SpanMapKind } from './protocol.js';

export interface TransformOutput {
  text: string;
  mappings: SpanMapping[];
  diagnosticDirectives?: DiagnosticDirectives;
  diagnostics: MapperDiagnostic[];
}

// Rename edits can only be written back through a Verbatim span, so atom and alias spans
// exclude Rename. A verbatim projection of the same token carries it instead.
const NON_RENAME_FEATURES = SpanMapFeature.All & ~SpanMapFeature.Rename;

// Hover results from multiple projections of the same original span are concatenated, so
// only the atom projection answers hover.
const NON_HOVER_FEATURES = SpanMapFeature.All & ~SpanMapFeature.Hover;

// The synthesized quotes around an unquoted url() specifier have no counterpart in the CSS,
// so they are mapped as zero-width spans. Only definition-style features are enabled for them
// so that requests on the whole string literal still resolve to the module.
const QUOTE_FEATURES =
  SpanMapFeature.Definition | SpanMapFeature.TypeDefinition | SpanMapFeature.Implementation | SpanMapFeature.References;

function createTextBuilder() {
  let text = '';
  const mappings: SpanMapping[] = [];
  const directives: MappedDiagnosticDirective[] = [];
  function append(chunk: string): void {
    text += chunk;
  }
  /** Appends `'name'` as a single atom, mapping the quote-inclusive literal to `loc`. */
  function appendAtomTokenName(name: string, loc: Location): void {
    mappings.push([text.length, name.length + 2, loc.start.offset, name.length, SpanMapKind.Atom, NON_RENAME_FEATURES]);
    text += `'${name}'`;
  }
  /** Appends `'name'`, mapping only the name verbatim to `loc` and leaving the quotes unmapped. */
  function appendVerbatimTokenName(name: string, loc: Location): void {
    mappings.push([
      text.length + 1,
      name.length,
      loc.start.offset,
      name.length,
      SpanMapKind.Verbatim,
      NON_HOVER_FEATURES,
    ]);
    text += `'${name}'`;
  }
  function appendQuoted(value: string, loc: Location): void {
    mappings.push([text.length, 1, loc.start.offset, 0, SpanMapKind.Atom, QUOTE_FEATURES]);
    mappings.push([text.length + 1, value.length, loc.start.offset, value.length, SpanMapKind.Verbatim]);
    mappings.push([text.length + 1 + value.length, 1, loc.end.offset, 0, SpanMapKind.Atom, QUOTE_FEATURES]);
    text += `'${value}'`;
  }
  return {
    append,
    appendAtomTokenName,
    /**
     * Appends `'name'` as an export name, mapping only the name verbatim to `loc`. Renaming
     * a module export rewrites the export name itself but not companion statements, so the
     * export name must be the verbatim span that rename edits write back through.
     */
    appendVerbatimExportName(name: string, loc: Location): void {
      mappings.push([text.length + 1, name.length, loc.start.offset, name.length, SpanMapKind.Verbatim]);
      text += `'${name}'`;
    },
    /** Appends `<object>['name'];`, mapping the quote-inclusive literal to `loc` as a single atom. */
    appendAtomElementAccessStatement(object: string, name: string, loc: Location): void {
      append(`${object}[`);
      appendAtomTokenName(name, loc);
      append('];\n');
    },
    /**
     * Appends `<object>['name'];`, mapping only the name verbatim to `loc`. TypeScript
     * diagnostics on the statement are suppressed, because the statement always duplicates
     * an atom projection that already reports them.
     */
    appendVerbatimElementAccessStatement(object: string, name: string, loc: Location): void {
      const start = text.length;
      append(`${object}[`);
      appendVerbatimTokenName(name, loc);
      append('];');
      directives.push([loc.start.offset, name.length, start, text.length, DiagnosticDirectivePolicy.Ignore]);
      append('\n');
    },
    /**
     * Appends the quoted specifier. When the original is quoted, the whole literal is mapped
     * verbatim. Otherwise (e.g. `url(./a.module.css)`), the synthesized quotes have no
     * counterpart in the CSS, so they are mapped as zero-width spans.
     */
    appendSpecifier(from: string, fromLoc: Location, quote: '"' | "'" | undefined): void {
      if (quote === undefined) {
        appendQuoted(from, fromLoc);
      } else {
        mappings.push([text.length, from.length + 2, fromLoc.start.offset - 1, from.length + 2, SpanMapKind.Verbatim]);
        text += `${quote}${from}${quote}`;
      }
    },
    /**
     * Appends `name`, mapping it as a zero-width span at the start of the CSS file so that
     * go-to-definition on a binding importing the module lands at the top of the file.
     */
    appendModuleAnchor(name: string): void {
      mappings.push([text.length, name.length, 0, 0, SpanMapKind.Atom, SpanMapFeature.Definition]);
      append(name);
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
    build(): { text: string; mappings: SpanMapping[]; directives: MappedDiagnosticDirective[] } {
      return { text, mappings, directives };
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
function specifierQuote(content: string, fromLoc: Location): '"' | "'" | undefined {
  const quote = content[fromLoc.start.offset - 1];
  return quote === '"' || quote === "'" ? quote : undefined;
}

/**
 * Transforms a CSS file into TypeScript text for the content mapper protocol.
 *
 * A CSS Module becomes a module exporting its tokens. The generated text delegates most
 * validation to the TypeScript checker: importing a missing file or referencing a missing
 * token becomes an ordinary type error, which tsgo maps back to the CSS through the
 * returned span mappings.
 *
 * Every token occurrence is projected twice: a literal in a declaration or export position
 * that result spans map back through, and a verbatim-mapped literal in an expression
 * statement. Declaration-position literals are atom-mapped including quotes, except export
 * names, which are verbatim-mapped because rename edits write back through them.
 *
 * A non-module CSS file becomes an empty module, so that importing it for its side effects
 * type-checks while it exports nothing.
 */
export function transformCSS(fileName: string, content: string, options: NormalizedMapperOptions): TransformOutput {
  if (!isCSSModuleFile(fileName)) {
    return { text: 'export {};\n', mappings: [], diagnostics: [] };
  }
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
  const { text, mappings, directives } = options.namedExports
    ? buildNamedExportsText(
        fileName,
        content,
        localTokens,
        tokenImporters,
        tokenReferences,
        options.prioritizeNamedImports,
      )
    : buildDefaultExportText(content, localTokens, tokenImporters, tokenReferences);
  return {
    text,
    mappings,
    ...(directives.length > 0 ? { diagnosticDirectives: { unusedExpectDirectiveDiagnostics: [], directives } } : {}),
    diagnostics: convertDiagnostics(cssModule.diagnostics, content),
  };
}

function buildDefaultExportText(
  content: string,
  localTokens: Token[],
  tokenImporters: TokenImporter[],
  tokenReferences: TokenReference[],
): { text: string; mappings: SpanMapping[]; directives: MappedDiagnosticDirective[] } {
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
    builder.appendAtomTokenName(token.name, token.loc);
    builder.append(': string; }\n');
    hasMembers = true;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type !== 'named') continue;
    const binding = importerBindings.get(tokenImporter)!;
    for (const entry of tokenImporter.entries) {
      builder.append('interface Styles { readonly ');
      builder.appendAtomTokenName(entry.localName ?? entry.name, entry.localLoc ?? entry.loc);
      builder.append(`: typeof ${binding}.default[`);
      builder.appendAtomTokenName(entry.name, entry.loc);
      builder.append(']; }\n');
      hasMembers = true;
    }
  }
  if (!hasMembers) builder.append('interface Styles {}\n');
  builder.append('declare const ');
  builder.appendModuleAnchor('styles');
  builder.append(': Styles');
  for (const allImporter of allImporters) {
    builder.append(` & __BlockErrorType<typeof ${importerBindings.get(allImporter)!}.default>`);
  }
  builder.append(';\n');
  for (const token of localTokens) {
    builder.appendVerbatimElementAccessStatement('styles', token.name, token.loc);
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type !== 'named') continue;
    const binding = importerBindings.get(tokenImporter)!;
    for (const entry of tokenImporter.entries) {
      builder.appendVerbatimElementAccessStatement(
        'styles',
        entry.localName ?? entry.name,
        entry.localLoc ?? entry.loc,
      );
      builder.appendVerbatimElementAccessStatement(`${binding}.default`, entry.name, entry.loc);
    }
  }
  for (const reference of tokenReferences) {
    if (reference.type === 'local') {
      builder.appendAtomElementAccessStatement('styles', reference.name, reference.loc);
      builder.appendVerbatimElementAccessStatement('styles', reference.name, reference.loc);
    } else {
      const binding = referenceBindings.get(reference)!;
      for (const entry of reference.entries) {
        builder.appendAtomElementAccessStatement(`${binding}.default`, entry.name, entry.loc);
        builder.appendVerbatimElementAccessStatement(`${binding}.default`, entry.name, entry.loc);
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
): { text: string; mappings: SpanMapping[]; directives: MappedDiagnosticDirective[] } {
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
    builder.appendVerbatimExportName(name, tokens[0]!.loc);
    builder.append(' };\n');
    isModule = true;
  }
  const importerBindings = new Map<TokenImporter, string>();
  let importCount = 0;
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type === 'all') {
      builder.append('export * from ');
      appendImportSpecifier(builder, content, tokenImporter);
    } else {
      builder.append('export {\n');
      for (const entry of tokenImporter.entries) {
        // Always the explicit `as` form, even for alias-less entries. Renaming the
        // propertyName and the localName renames the imported and the exported token
        // respectively, and both projections of an alias-less entry combine into a
        // full-chain rename of the CSS token.
        builder.append('  ');
        builder.appendVerbatimExportName(entry.name, entry.loc);
        builder.append(' as ');
        builder.appendVerbatimExportName(entry.localName ?? entry.name, entry.localLoc ?? entry.loc);
        builder.append(',\n');
      }
      builder.append('} from ');
      appendImportSpecifier(builder, content, tokenImporter);
      if (tokenImporter.entries.length > 0) {
        const binding = `_import_${importCount++}`;
        importerBindings.set(tokenImporter, binding);
        builder.append(`import * as ${binding} from `);
        appendImportSpecifier(builder, content, tokenImporter);
      }
    }
    isModule = true;
  }
  const referenceBindings = new Map<TokenReference, string>();
  for (const reference of tokenReferences) {
    if (reference.type !== 'external') continue;
    const binding = `_import_${importCount++}`;
    referenceBindings.set(reference, binding);
    builder.append(`import * as ${binding} from `);
    appendImportSpecifier(builder, content, reference);
    isModule = true;
  }
  const needsSelf =
    localTokens.length > 0 ||
    importerBindings.size > 0 ||
    tokenReferences.some((reference) => reference.type === 'local');
  if (needsSelf) {
    // A real self-import rather than a `typeof import()` declaration, because renaming a
    // module export only propagates to accesses through real import bindings.
    builder.append(`import * as __self from './${basename(fileName)}';\n`);
  }
  for (const token of localTokens) {
    builder.appendVerbatimElementAccessStatement('__self', token.name, token.loc);
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type !== 'named') continue;
    const binding = importerBindings.get(tokenImporter);
    if (binding === undefined) continue;
    for (const entry of tokenImporter.entries) {
      builder.appendVerbatimElementAccessStatement(
        '__self',
        entry.localName ?? entry.name,
        entry.localLoc ?? entry.loc,
      );
      builder.appendVerbatimElementAccessStatement(binding, entry.name, entry.loc);
    }
  }
  for (const reference of tokenReferences) {
    if (reference.type === 'local') {
      builder.appendAtomElementAccessStatement('__self', reference.name, reference.loc);
      builder.appendVerbatimElementAccessStatement('__self', reference.name, reference.loc);
    } else {
      const binding = referenceBindings.get(reference)!;
      for (const entry of reference.entries) {
        builder.appendAtomElementAccessStatement(binding, entry.name, entry.loc);
        builder.appendVerbatimElementAccessStatement(binding, entry.name, entry.loc);
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

// Core diagnostics have no code of their own, so they all share one mapper diagnostic code.
const CSS_MODULE_DIAGNOSTIC_CODE = 1000;

function convertDiagnostics(diagnostics: DiagnosticWithLocation[], content: string): MapperDiagnostic[] {
  return diagnostics
    .filter((diagnostic) => diagnostic.category === 'error')
    .map((diagnostic) => ({
      messageText: diagnostic.text,
      start: toOffset(content, diagnostic.start.line, diagnostic.start.column),
      length: diagnostic.length,
      code: CSS_MODULE_DIAGNOSTIC_CODE,
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
