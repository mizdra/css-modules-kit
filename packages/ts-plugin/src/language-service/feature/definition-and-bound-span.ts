import type { Language } from '@volar/language-core';
import type ts from 'typescript';
import { CMK_DATA_KEY, isCSSModuleScript } from '../../language-plugin.js';

export function getDefinitionAndBoundSpan(
  language: Language<string>,
  languageService: ts.LanguageService,
): ts.LanguageService['getDefinitionAndBoundSpan'] {
  return (...args) => {
    const result = languageService.getDefinitionAndBoundSpan(...args);
    if (!result) return;
    if (!result.definitions) return result;
    for (const def of result.definitions) {
      const script = language.scripts.get(def.fileName);
      if (!isCSSModuleScript(script)) continue;

      const cssModule = script.generated.root[CMK_DATA_KEY];

      // Search tokens and set `contextSpan`. `contextSpan` is used for Definition Preview in editors.
      const defName = unquote(def.name);
      const localToken = cssModule.localTokens.find(
        (t) => t.name === defName && t.loc.start.offset === def.textSpan.start,
      );
      if (localToken?.declarationLoc) {
        def.contextSpan = {
          start: localToken.declarationLoc.start.offset,
          length: localToken.declarationLoc.end.offset - localToken.declarationLoc.start.offset,
        };
        continue;
      }
      const importedValue = cssModule.tokenImporters
        .flatMap((i) => (i.type === 'value' ? i.values : []))
        .find((v) => {
          const localName = v.localName ?? v.name;
          const localLoc = v.localLoc ?? v.loc;
          return localName === defName && localLoc.start.offset === def.textSpan.start;
        });
      if (importedValue) {
        const loc = importedValue.localLoc ?? importedValue.loc;
        def.contextSpan = {
          start: loc.start.offset,
          length: loc.end.offset - loc.start.offset,
        };
      }
    }
    return result;
  };
}

/**
 * Removes surrounding single quotes from a string if present.
 * When `namedExport` is false, `def.name` is `"'tokenName'"` (with quotes),
 * but `token.name` is `"tokenName"` (without quotes).
 */
function unquote(name: string): string {
  if (name.length >= 2 && name.startsWith("'") && name.endsWith("'")) {
    return name.slice(1, -1);
  }
  return name;
}
