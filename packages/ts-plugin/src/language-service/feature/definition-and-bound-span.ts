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

    const newDefinitions: ts.DefinitionInfo[] = [];
    for (const def of result.definitions) {
      // Clicks on a module-level reference (e.g. `styles` in `import styles from '...'`
      // or the module specifier itself) surface as a zero-length span at file start.
      // Keep them as-is; they aren't tokens to be matched against `localTokens`.
      if (def.textSpan.start === 0 && def.textSpan.length === 0) {
        newDefinitions.push(def);
        continue;
      }
      const script = language.scripts.get(def.fileName);
      if (!isCSSModuleScript(script)) {
        newDefinitions.push(def);
        continue;
      }
      const cssModule = script.generated.root[CMK_DATA_KEY];
      const defName = unquote(def.name);

      // Keep only definitions that map to a token declared in this module's `localTokens`.
      // Re-exports from `@value ... from '...'` aren't declarations here, so they're excluded —
      // their real declaration lives in the target file.
      const localToken = cssModule.localTokens.find(
        (t) => t.name === defName && t.loc.start.offset === def.textSpan.start,
      );
      if (!localToken) continue;

      // Set `contextSpan` for local tokens. `contextSpan` is used for Definition Preview in editors.
      if (localToken.declarationLoc) {
        def.contextSpan = {
          start: localToken.declarationLoc.start.offset,
          length: localToken.declarationLoc.end.offset - localToken.declarationLoc.start.offset,
        };
      }

      newDefinitions.push(def);
    }
    result.definitions = newDefinitions;
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
