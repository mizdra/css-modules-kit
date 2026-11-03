import type { DiagnosticWithLocation, Token } from '@css-modules-kit/core';
import { isCSSModuleFile, parseCSSModule, validateTokenName } from '@css-modules-kit/core';
import type { MapperDiagnostic, SpanMapping } from './protocol.js';
import { SpanMapFeature, SpanMapKind } from './protocol.js';

export interface TransformOutput {
  text: string;
  mappings: SpanMapping[];
  diagnostics: MapperDiagnostic[];
}

// Rename edits can only be written back through a Verbatim span, so the declaration excludes Rename.
const DECLARATION_FEATURES = SpanMapFeature.All & ~SpanMapFeature.Rename;

// Hover results from multiple spans of the same original span are concatenated, so only the declaration answers hover.
const SELF_REFERENCE_FEATURES = SpanMapFeature.All & ~SpanMapFeature.Hover;

/**
 * Transforms a CSS file into TypeScript text for the content mapper protocol.
 *
 * For each occurrence of a local token, the generated text has two parts:
 *
 * - The declaration `interface Styles { readonly '<name>': string }`. It is mapped with an Atom
 *   span including the quotes, because a definition is mapped back only when its whole range,
 *   which includes the quotes, fits in a single span.
 * - The reference to itself `styles['<name>'];`. It is mapped with a Verbatim span, through which
 *   rename edits are written back.
 *
 * A non-module CSS file becomes an empty module, so that importing it for its side effects
 * type-checks while it exports nothing.
 */
export function transformCSS(fileName: string, content: string): TransformOutput {
  if (!isCSSModuleFile(fileName)) {
    return { text: 'export {};\n', mappings: [], diagnostics: [] };
  }
  const cssModule = parseCSSModule(content, {
    fileName,
    includeSyntaxError: true,
    animation: true,
    dashedIdents: false,
    container: false,
    namedExports: false,
  });
  const tokens = cssModule.localTokens.filter(
    (token) => validateTokenName(token.name, { namedExports: false }) === undefined,
  );
  return { ...generateText(tokens), diagnostics: convertDiagnostics(cssModule.diagnostics, content) };
}

function generateText(tokens: Token[]): Pick<TransformOutput, 'text' | 'mappings'> {
  let text = '';
  const mappings: SpanMapping[] = [];

  for (const { name, loc } of tokens) {
    text += 'interface Styles { readonly ';
    mappings.push([
      text.length,
      name.length + 2,
      loc.start.offset,
      name.length,
      SpanMapKind.Atom,
      DECLARATION_FEATURES,
    ]);
    text += `'${name}': string }\n`;
  }
  text += 'declare const ';
  // Mapped to the start of the CSS file so that go-to-definition on a binding importing the module lands there.
  mappings.push([text.length, 'styles'.length, 0, 0, SpanMapKind.Atom, SpanMapFeature.Definition]);
  text += `styles: ${tokens.length > 0 ? 'Styles' : '{}'};\n`;
  for (const { name, loc } of tokens) {
    text += "styles['";
    mappings.push([
      text.length,
      name.length,
      loc.start.offset,
      name.length,
      SpanMapKind.Verbatim,
      SELF_REFERENCE_FEATURES,
    ]);
    text += `${name}'];\n`;
  }
  text += 'export default styles;\n';
  return { text, mappings };
}

// Core diagnostics have no code of their own, so they all share one mapper diagnostic code.
const CSS_MODULE_DIAGNOSTIC_CODE = 1000;

function convertDiagnostics(diagnostics: DiagnosticWithLocation[], content: string): MapperDiagnostic[] {
  return (
    diagnostics
      // A mapper diagnostic has no severity and is always reported as an error.
      .filter((diagnostic) => diagnostic.category === 'error')
      .map((diagnostic) => ({
        messageText: diagnostic.text,
        start: toOffset(content, diagnostic.start.line, diagnostic.start.column),
        length: diagnostic.length,
        code: CSS_MODULE_DIAGNOSTIC_CODE,
      }))
  );
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
