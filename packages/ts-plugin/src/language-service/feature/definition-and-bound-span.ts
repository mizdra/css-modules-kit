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
      if (isCSSModuleScript(script)) {
        const cssModule = script.generated.root[CMK_DATA_KEY];
        const token = cssModule.localTokens.find((t) => t.name === def.name);
        if (token?.declarationLoc) {
          def.contextSpan = {
            start: token.declarationLoc.start.offset,
            length: token.declarationLoc.end.offset - token.declarationLoc.start.offset,
          };
        }
      }
    }
    return result;
  };
}
