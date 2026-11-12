import type { DiagnosticWithLocation, Token } from '@css-modules-kit/core';
import { isCSSModuleFile, parseCSSModule, validateTokenName } from '@css-modules-kit/core';
import { SpanMapFeature, SpanMapKind } from 'typescript/ast';
import type { MapperDiagnostic, SpanMapping } from './protocol.js';

export interface TransformOutput {
  text: string;
  mappings: SpanMapping[];
  diagnostics: MapperDiagnostic[];
}

/** Transforms a CSS file into TypeScript text for the content mapper protocol. */
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
    // The span includes the quotes because go-to-definition works only when the quotes are mapped as well.
    // Rename is not enabled because TypeScript writes rename edits back only through a Verbatim span.
    mappings.push([
      text.length,
      name.length + 2,
      loc.start.offset,
      name.length,
      SpanMapKind.Atom,
      SpanMapFeature.Definition | SpanMapFeature.References | SpanMapFeature.DocumentHighlights,
    ]);
    text += `'${name}': string }\n`;
  }
  text += 'declare const ';
  // Generates a mapping so that Go to Definition on `styles` in `import styles from '...'`
  // jumps to the start of the CSS file.
  mappings.push([text.length, 'styles'.length, 0, 0, SpanMapKind.Atom, SpanMapFeature.Definition]);
  text += `styles: ${tokens.length > 0 ? 'Styles' : '{}'};\n`;
  // A reference to each token, which exists only to provide a Verbatim mapping that writes rename edits back.
  for (const { name, loc } of tokens) {
    text += "styles['";
    mappings.push([
      text.length,
      name.length,
      loc.start.offset,
      name.length,
      SpanMapKind.Verbatim,
      SpanMapFeature.Rename,
    ]);
    text += `${name}'];\n`;
  }
  text += 'export default styles;\n';
  return { text, mappings };
}

// Core diagnostics have no code of their own, so they all share the code 0.
// Codes for each kind of diagnostic will start from 1.
const CSS_MODULE_DIAGNOSTIC_CODE = 0;

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
