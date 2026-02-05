import type ts from 'typescript';

export function findReferences(languageService: ts.LanguageService): ts.LanguageService['findReferences'] {
  return (...args) => {
    const symbols = languageService.findReferences(...args);
    if (!symbols) return symbols;
    return mergeSameDefinitionSymbols(symbols);
  };
}

/**
 * Merges ReferencedSymbols that have the same definition into one,
 * combining their references.
 */
function mergeSameDefinitionSymbols(symbols: ts.ReferencedSymbol[]): ts.ReferencedSymbol[] {
  // Volar.js may return multiple ReferencedSymbols with the same definition
  // when a VirtualCode contains multiple CodeMapping objects.
  // Editors usually merge symbols with the same definition before displaying them,
  // so this typically isn't an issue in practice.
  // However, we merge them here to make comparisons in tests easier.
  const map = new Map<string, ts.ReferencedSymbol>();
  for (const symbol of symbols) {
    const def = symbol.definition;
    const key = `${def.fileName}:${def.textSpan.start}:${def.textSpan.length}`;
    const existing = map.get(key);
    if (existing) {
      existing.references = uniqueReferences([...existing.references, ...symbol.references]);
    } else {
      map.set(key, symbol);
    }
  }
  return Array.from(map.values());
}

function uniqueReferences(references: ts.ReferencedSymbolEntry[]): ts.ReferencedSymbolEntry[] {
  const seen = new Set<string>();
  const result: ts.ReferencedSymbolEntry[] = [];
  for (const ref of references) {
    const key = `${ref.fileName}:${ref.textSpan.start}:${ref.textSpan.length}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(ref);
    }
  }
  return result;
}
