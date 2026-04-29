import type { CMKConfig } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import ts from 'typescript';
import { CMK_DATA_KEY, isCSSModuleScript } from '../../language-plugin.js';

function isModuleLevelDefinition(def: ts.DefinitionInfo, config: CMKConfig): boolean {
  const isModuleOrScript =
    def.kind === ts.ScriptElementKind.moduleElement || def.kind === ts.ScriptElementKind.scriptElement;
  const isStylesConst = def.kind === ts.ScriptElementKind.constElement && def.name === 'styles';
  const isZeroLengthSpan = def.textSpan.start === 0 && def.textSpan.length === 0;
  return (isModuleOrScript || (!config.namedExports && isStylesConst)) && isZeroLengthSpan;
}

export function getDefinitionAndBoundSpan(
  language: Language<string>,
  languageService: ts.LanguageService,
  config: CMKConfig,
): ts.LanguageService['getDefinitionAndBoundSpan'] {
  return (...args) => {
    const result = languageService.getDefinitionAndBoundSpan(...args);
    if (!result) return;
    if (!result.definitions) return result;

    const newDefinitions: ts.DefinitionInfo[] = [];
    for (const def of result.definitions) {
      const script = language.scripts.get(def.fileName);
      if (!isCSSModuleScript(script)) {
        newDefinitions.push(def);
        continue;
      }

      // Clicks on a module-level reference (e.g. `styles` in `import styles from '...'`
      // or the module specifier itself) surface as a zero-length span at file start.
      // Keep them as-is; they aren't tokens to be matched against `localTokens`.
      if (isModuleLevelDefinition(def, config)) {
        newDefinitions.push(def);
        continue;
      }

      const cssModule = script.generated.root[CMK_DATA_KEY];

      const localToken = cssModule.localTokens.find((t) => t.loc.start.offset === def.textSpan.start);

      // Due to the structure of .d.ts files, tokens imported via `@value ... from ...` may be included in `result.definitions`.
      // Since these are tokens imported from other modules, they should not be returned as definitions.
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
