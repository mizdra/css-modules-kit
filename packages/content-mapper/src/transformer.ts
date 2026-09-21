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

// The generated text around a name (e.g. the quotes of `'a_1'`) has no counterpart in the CSS, so
// it is mapped as zero-width spans. TypeScript reports a diagnostic on a node larger than the name
// (e.g. `'a_1'` or `styles['a_1']`), and the diagnostic is mapped back to the exact range in the
// CSS only when the whole node is mapped. Language service features are disabled for these spans.
const NO_FEATURES = 0;

// The quotes synthesized around an unquoted url() specifier additionally answer definition-style
// requests, so that a request on the opening parenthesis still resolves to the module.
const URL_QUOTE_FEATURES =
  SpanMapFeature.Definition | SpanMapFeature.TypeDefinition | SpanMapFeature.Implementation | SpanMapFeature.References;

function createTextBuilder() {
  let text = '';
  const mappings: SpanMapping[] = [];
  const directives: MappedDiagnosticDirective[] = [];
  function append(chunk: string): void {
    text += chunk;
  }
  /**
   * Appends `<prefix><value><suffix>`, mapping the value verbatim to `loc`, and the prefix and
   * the suffix as zero-width spans around it.
   */
  function appendAffixed(
    [prefix, value, suffix]: [string, string, string],
    loc: Location,
    features: number,
    affixFeatures: number,
  ): void {
    const start = loc.start.offset;
    const end = start + value.length;
    mappings.push([text.length, prefix.length, start, 0, SpanMapKind.Atom, affixFeatures]);
    text += prefix;
    mappings.push(
      features === SpanMapFeature.All
        ? [text.length, value.length, start, value.length, SpanMapKind.Verbatim]
        : [text.length, value.length, start, value.length, SpanMapKind.Verbatim, features],
    );
    text += value;
    mappings.push([text.length, suffix.length, end, 0, SpanMapKind.Atom, affixFeatures]);
    text += suffix;
  }
  return {
    append,
    /**
     * Appends `'name'` as a single atom, mapping the quote-inclusive literal to `loc`. TypeScript
     * reports the name of a declaration with the quotes included (e.g. Go to Definition results),
     * and a reported span is mapped back only when it fits in a single span mapping.
     */
    appendAtomTokenName(name: string, loc: Location): void {
      mappings.push([
        text.length,
        name.length + 2,
        loc.start.offset,
        name.length,
        SpanMapKind.Atom,
        NON_RENAME_FEATURES,
      ]);
      text += `'${name}'`;
    },
    /** Appends `'name'`, mapping the name verbatim to `loc`. Rename edits are written back through it. */
    appendVerbatimTokenName(name: string, loc: Location, features: number = SpanMapFeature.All): void {
      appendAffixed(["'", name, "'"], loc, features, NO_FEATURES);
    },
    /** Appends `<object>['name']`, mapping the name verbatim to `loc`. Rename edits are written back through it. */
    appendVerbatimElementAccess(
      object: string,
      name: string,
      loc: Location,
      features: number = SpanMapFeature.All,
    ): void {
      appendAffixed([`${object}['`, name, `']`], loc, features, NO_FEATURES);
    },
    /**
     * Appends the quoted specifier. When the original is quoted, the whole literal is mapped
     * verbatim. Otherwise (e.g. `url(./a.module.css)`), the synthesized quotes have no
     * counterpart in the CSS, so they are mapped as zero-width spans.
     */
    appendSpecifier(from: string, fromLoc: Location, quote: '"' | "'" | undefined): void {
      if (quote === undefined) {
        appendAffixed(["'", from, "'"], fromLoc, SpanMapFeature.All, URL_QUOTE_FEATURES);
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
    /** Appends the quoted specifier without mapping it, and suppresses the TypeScript diagnostics on it. */
    appendUnmappedSpecifier(from: string, fromLoc: Location): void {
      const start = text.length;
      text += `'${from}'`;
      directives.push([fromLoc.start.offset, from.length, start, text.length, DiagnosticDirectivePolicy.Ignore]);
    },
    build(): BuiltText {
      return { text, mappings, directives };
    },
  };
}

type TextBuilder = ReturnType<typeof createTextBuilder>;

interface BuiltText {
  text: string;
  mappings: SpanMapping[];
  directives: MappedDiagnosticDirective[];
}

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
 * The generated text is the one `generateDts` of `@css-modules-kit/core` generates for ts-plugin
 * (see docs/ts-plugin-internals.md), except for the following:
 *
 * - `// @ts-nocheck` is omitted, so that importing a missing file or referencing a missing token
 *   becomes an ordinary type error, which tsgo maps back to the CSS through the span mappings.
 *   For the same reason, the specifiers that do not resolve to CSS Modules are omitted.
 * - Each declared token is additionally emitted as a reference to itself, in the form of a local
 *   token reference (`styles['<name>'];` or `import { '<name>' as __ref_N } from './<self>';`).
 *   Rename edits are written back only through a verbatim span mapping, which the declaration of
 *   a token cannot have: the `'<name>'` of `interface Styles { readonly '<name>': string }` is
 *   atom-mapped including the quotes so that definitions land on it, and `_token_N` is alias-mapped.
 * - A specifier is quoted with the original quote character, because a verbatim span mapping
 *   requires identical text.
 *
 * The generated text expresses only the relations that TypeScript follows by itself. The
 * relations between different TypeScript symbols (e.g. the `<name>` and the `<alias>` of
 * `@value <name> as <alias> from '<specifier>'`) are left to the LSP middleware.
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
      reference.type === 'local' ? isValidTokenName(reference.name, options) : isImportableSpecifier(reference.from),
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
): BuiltText {
  const builder = createTextBuilder();
  if (tokenImporters.some((tokenImporter) => tokenImporter.type === 'all')) {
    // Maps an `any`-typed module (e.g. an unresolvable import) to `{}` so that it does not
    // absorb the other intersection members.
    builder.append('type BlockErrorType<T> = [0] extends [1 & T] ? {} : T;\n');
  }
  // Each token occurrence gets its own interface declaration so that duplicated names
  // merge instead of colliding, while every occurrence stays a declaration.
  let hasStylesInterface = false;
  for (const token of localTokens) {
    builder.append('interface Styles { readonly ');
    builder.appendAtomTokenName(token.name, token.loc);
    builder.append(': string }\n');
    hasStylesInterface = true;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type !== 'named') continue;
    for (const [i, entry] of tokenImporter.entries.entries()) {
      builder.append('interface Styles { readonly ');
      builder.appendAtomTokenName(entry.localName ?? entry.name, entry.localLoc ?? entry.loc);
      builder.append(': typeof import(');
      // Only the first specifier is mapped. If every specifier were mapped, an unresolvable
      // specifier would be reported once per entry, and a file rename would edit it once per entry.
      if (i === 0) {
        appendSpecifier(builder, content, tokenImporter);
      } else {
        builder.appendUnmappedSpecifier(tokenImporter.from, tokenImporter.fromLoc);
      }
      builder.append(').default[');
      builder.appendVerbatimTokenName(entry.name, entry.loc);
      builder.append('] }\n');
      hasStylesInterface = true;
    }
  }
  builder.append('declare const ');
  builder.appendModuleAnchor('styles');
  builder.append(': ');
  let termCount = 0;
  if (hasStylesInterface) {
    builder.append('Styles');
    termCount++;
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type !== 'all') continue;
    if (termCount > 0) builder.append('\n  & ');
    termCount++;
    builder.append('BlockErrorType<typeof import(');
    appendSpecifier(builder, content, tokenImporter);
    builder.append(').default>');
  }
  if (termCount === 0) builder.append('{}');
  builder.append(';\n');
  // tsgo searches a file for references only when the searched name appears in the name table of
  // the file. The `<name>` of an aliased entry appears only in an indexed access type, which is
  // not registered there, but element access arguments are.
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type !== 'named') continue;
    for (const entry of tokenImporter.entries) {
      if (entry.localName === undefined) continue;
      builder.append(`({} as any)['${entry.name}'];\n`);
    }
  }
  // The references of the declared tokens to themselves, through which rename edits are written back.
  for (const token of localTokens) {
    appendElementAccessStatement(builder, 'styles', token.name, token.loc, NON_HOVER_FEATURES);
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type !== 'named') continue;
    for (const entry of tokenImporter.entries) {
      appendElementAccessStatement(
        builder,
        'styles',
        entry.localName ?? entry.name,
        entry.localLoc ?? entry.loc,
        NON_HOVER_FEATURES,
      );
    }
  }
  let refIndex = 0;
  for (const reference of tokenReferences) {
    if (reference.type === 'local') {
      appendElementAccessStatement(builder, 'styles', reference.name, reference.loc);
      continue;
    }
    const binding = `__ref_${refIndex++}`;
    builder.append(`import ${binding} from `);
    appendSpecifier(builder, content, reference);
    builder.append(';\n');
    for (const entry of reference.entries) {
      appendElementAccessStatement(builder, binding, entry.name, entry.loc);
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
): BuiltText {
  const builder = createTextBuilder();
  const exportedNames = new Set<string>();
  const groups = Object.groupBy(localTokens, (token) => token.name);
  for (const [index, [name, tokens]] of Object.entries(groups).entries()) {
    if (tokens === undefined) continue;
    const internalName = `_token_${index}`;
    for (const token of tokens) {
      builder.append('var ');
      builder.appendAlias(internalName, token.loc);
      builder.append(': string;\n');
    }
    builder.append(`export { ${internalName} as `);
    builder.appendVerbatimTokenName(name, tokens[0]!.loc);
    builder.append(' };\n');
    exportedNames.add(name);
  }
  for (const tokenImporter of tokenImporters) {
    if (tokenImporter.type === 'all') {
      builder.append('export * from ');
      appendSpecifier(builder, content, tokenImporter);
      builder.append(';\n');
      continue;
    }
    builder.append('export {\n');
    for (const entry of tokenImporter.entries) {
      // A module cannot export the same name twice, so an entry whose exported name is already
      // exported (by a local token or an earlier entry) is omitted. Its positions are left unmapped.
      const exportedName = entry.localName ?? entry.name;
      if (exportedNames.has(exportedName)) continue;
      exportedNames.add(exportedName);
      // An entry without an alias is the shorthand form `'v1'`, not `'v1' as 'v1'`. tsgo follows
      // a shorthand export specifier to the imported token and to the usages of the exported
      // token, but stops at an export specifier with a property name.
      builder.append('  ');
      builder.appendVerbatimTokenName(entry.name, entry.loc);
      if (entry.localName !== undefined && entry.localLoc !== undefined) {
        builder.append(' as ');
        builder.appendVerbatimTokenName(entry.localName, entry.localLoc);
      }
      builder.append(',\n');
    }
    builder.append('} from ');
    appendSpecifier(builder, content, tokenImporter);
    builder.append(';\n');
  }
  // Ensure the generated text is treated as a module even when no other top-level
  // export/import is emitted (e.g. an empty CSS Module file).
  if (localTokens.length === 0 && tokenImporters.length === 0) {
    builder.append('export {};\n');
  }
  // Each token reference is an import of the referenced token, which gives the reference a
  // position that tsgo reports in Find All References and Rename. The import bindings are never
  // read, but TypeScript does not report unused imports whose names start with `_`.
  let refIndex = 0;
  function appendSelfImport(name: string, loc: Location, features?: number): void {
    builder.append('import { ');
    builder.appendVerbatimTokenName(name, loc, features);
    builder.append(` as __ref_${refIndex++} } from './${basename(fileName)}';\n`);
  }
  // The references of the local tokens to themselves, through which rename edits are written back.
  // A rename that reaches the token through a named token importer of another file
  // (`export { '<name>' } from`) arrives at `_token_N` and these references, but not at the
  // `'<name>'` of `export { _token_N as '<name>' }`.
  for (const token of localTokens) {
    appendSelfImport(token.name, token.loc, NON_HOVER_FEATURES);
  }
  for (const reference of tokenReferences) {
    if (reference.type === 'local') {
      appendSelfImport(reference.name, reference.loc);
      continue;
    }
    builder.append('import {');
    for (const [i, entry] of reference.entries.entries()) {
      builder.append(i === 0 ? ' ' : ', ');
      builder.appendVerbatimTokenName(entry.name, entry.loc);
      builder.append(` as __ref_${refIndex++}`);
    }
    builder.append(' } from ');
    appendSpecifier(builder, content, reference);
    builder.append(';\n');
  }
  if (!prioritizeNamedImports) {
    // Export `styles` to appear in code completion suggestions
    builder.append('declare const styles: {};\nexport default styles;\n');
  }
  return builder.build();
}

function appendElementAccessStatement(
  builder: TextBuilder,
  object: string,
  name: string,
  loc: Location,
  features?: number,
): void {
  builder.appendVerbatimElementAccess(object, name, loc, features);
  builder.append(';\n');
}

function appendSpecifier(builder: TextBuilder, content: string, importer: { from: string; fromLoc: Location }): void {
  builder.appendSpecifier(importer.from, importer.fromLoc, specifierQuote(content, importer.fromLoc));
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
