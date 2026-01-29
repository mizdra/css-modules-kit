import { isCSSModuleFile } from '@css-modules-kit/core';
import type ts from 'typescript';

export function findReferences(languageService: ts.LanguageService): ts.LanguageService['findReferences'] {
  return (...args) => {
    const [fileName] = args;
    const result = languageService.findReferences(...args);
    if (!result) return result;
    const isCssRequest = isCSSModuleFile(fileName);
    const sharedSeen = isCssRequest ? new Set<string>() : undefined;
    return result.map((symbol) => {
      const references = dedupeReferences(symbol.references, sharedSeen);
      return {
        ...symbol,
        references,
      };
    });
  };
}

export function getReferencesAtPosition(
  languageService: ts.LanguageService,
): ts.LanguageService['getReferencesAtPosition'] {
  return (...args) => {
    const [fileName] = args;
    const result = languageService.getReferencesAtPosition(...args);
    if (!result) return result;
    if (isCSSModuleFile(fileName)) {
      return dedupeReferences(result);
    }
    return result;
  };
}

/**
 * DTS and CSS mappings are duplicated,
 * so CSS references may duplicate when fetching the list from a CSS file.
 */
function dedupeReferences(references: readonly ts.ReferenceEntry[], seen = new Set<string>()) {
  return references.filter((ref) => {
    const key = `${ref.fileName}:${ref.textSpan.start}:${ref.textSpan.length}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
