import type { CSSModule, MatchesPattern, Resolver } from '@css-modules-kit/core';
import { isCSSModuleFile } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import ts from 'typescript';
import { CMK_DATA_KEY, isCSSModuleScript } from '../../language-plugin.js';

function normalizeDefinitionName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const first = name[0];
  const last = name[name.length - 1];
  if ((first === "'" || first === '"' || first === '`') && last === first && name.length >= 2) {
    return name.slice(1, -1);
  }
  return name;
}

function toTextSpan(loc: { start: { offset: number }; end: { offset: number } }): ts.TextSpan {
  return { start: loc.start.offset, length: loc.end.offset - loc.start.offset };
}

function dedupeDefinitions(definitions: readonly ts.DefinitionInfo[]): ts.DefinitionInfo[] {
  const seen = new Set<string>();
  const result: ts.DefinitionInfo[] = [];
  for (const def of definitions) {
    const context = def.contextSpan ? `${def.contextSpan.start}:${def.contextSpan.length}` : 'none';
    const key = `${def.fileName}:${def.textSpan.start}:${def.textSpan.length}:${context}:${def.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(def);
  }
  return result;
}

export function getDefinitionAndBoundSpan(
  language: Language<string>,
  languageService: ts.LanguageService,
  resolver: Resolver,
  matchesPattern: MatchesPattern,
  getCSSModule: (path: string) => CSSModule | undefined,
): ts.LanguageService['getDefinitionAndBoundSpan'] {
  return (...args) => {
    const [fileName, position] = args;
    const result = languageService.getDefinitionAndBoundSpan(...args);
    const scriptAtPos = language.scripts.get(fileName);
    if ((!result || !result.definitions || result.definitions.length === 0) && isCSSModuleScript(scriptAtPos)) {
      const cssModule = scriptAtPos.generated.root[CMK_DATA_KEY];
      for (const importer of cssModule.tokenImporters) {
        if (importer.type !== 'value') continue;
        for (const value of importer.values) {
          const localLoc = value.localLoc ?? value.loc;
          const isInLocal = position >= localLoc.start.offset && position < localLoc.end.offset;
          const isInValue = position >= value.loc.start.offset && position < value.loc.end.offset;
          if (!isInLocal && !isInValue) continue;

          const resolved = resolver(importer.from, { request: cssModule.fileName });
          const importedModule =
            resolved && matchesPattern(resolved) && isCSSModuleFile(resolved) ? getCSSModule(resolved) : undefined;
          if (!importedModule) continue;

          const targetName = value.name;
          const matches = importedModule.localTokens.filter((token) => token.name === targetName);
          if (matches.length === 0) continue;
          const definitions = matches.map((token) => {
            const definition: ts.DefinitionInfo = {
              fileName: importedModule.fileName,
              textSpan: toTextSpan(token.loc),
              kind: ts.ScriptElementKind.variableElement,
              name: token.name,
              containerKind: ts.ScriptElementKind.unknown,
              containerName: '',
            };
            if (token.declarationLoc) {
              definition.contextSpan = toTextSpan(token.declarationLoc);
            }
            return definition;
          });
          return { definitions, textSpan: toTextSpan(isInLocal ? localLoc : value.loc) };
        }
      }
      const tokenAtPos = cssModule.localTokens.find(
        (token) => position >= token.loc.start.offset && position < token.loc.end.offset,
      );
      if (tokenAtPos) {
        const matches = cssModule.localTokens.filter((token) => token.name === tokenAtPos.name);
        const definitions = matches.map((token) => {
          const definition: ts.DefinitionInfo = {
            fileName,
            textSpan: toTextSpan(token.loc),
            kind: ts.ScriptElementKind.variableElement,
            name: token.name,
            containerKind: ts.ScriptElementKind.unknown,
            containerName: '',
          };
          if (token.declarationLoc) {
            definition.contextSpan = toTextSpan(token.declarationLoc);
          }
          return definition;
        });
        return { definitions, textSpan: toTextSpan(tokenAtPos.loc) };
      }
    }
    if (!result) return;
    if (!result.definitions) return result;
    const updatedDefinitions: ts.DefinitionInfo[] = [];
    for (const def of result.definitions) {
      const script = language.scripts.get(def.fileName);
      if (isCSSModuleScript(script)) {
        const cssModule = script.generated.root[CMK_DATA_KEY];
        const tokenName = normalizeDefinitionName(def.name);
        if (!tokenName) {
          updatedDefinitions.push(def);
          continue;
        }
        const localTokens = cssModule.localTokens.filter((t) => t.name === tokenName);
        if (localTokens.length > 0) {
          const first = localTokens[0];
          if (!first) continue;
          const updated: ts.DefinitionInfo = {
            ...def,
            textSpan: toTextSpan(first.loc),
            ...(first.declarationLoc ? { contextSpan: toTextSpan(first.declarationLoc) } : {}),
          };
          updatedDefinitions.push(updated);
          for (const token of localTokens.slice(1)) {
            const cloned: ts.DefinitionInfo = {
              ...def,
              textSpan: toTextSpan(token.loc),
              ...(token.declarationLoc ? { contextSpan: toTextSpan(token.declarationLoc) } : {}),
            };
            updatedDefinitions.push(cloned);
          }
          continue;
        }
        const importedLocs: { start: { offset: number }; end: { offset: number } }[] = [];
        let resolvedToImported = false;
        for (const importer of cssModule.tokenImporters) {
          if (importer.type !== 'value') continue;
          for (const value of importer.values) {
            const localName = value.localName ?? value.name;
            const matchesTokenName = localName === tokenName || value.name === tokenName;
            if (!matchesTokenName) continue;
            const fallbackLoc = (matchesTokenName && tokenName === localName ? value.localLoc : value.loc) ?? value.loc;
            importedLocs.push(fallbackLoc as { start: { offset: number }; end: { offset: number } });
            const resolved = resolver(importer.from, { request: cssModule.fileName });
            const importedModule =
              resolved && matchesPattern(resolved) && isCSSModuleFile(resolved) ? getCSSModule(resolved) : undefined;
            if (importedModule) {
              const matches = importedModule.localTokens.filter((token) => token.name === value.name);
              if (matches.length > 0) {
                const first = matches[0];
                if (!first) continue;
                const updated: ts.DefinitionInfo = {
                  ...def,
                  fileName: importedModule.fileName,
                  textSpan: toTextSpan(first.loc),
                  ...(first.declarationLoc ? { contextSpan: toTextSpan(first.declarationLoc) } : {}),
                };
                updatedDefinitions.push(updated);
                for (const token of matches.slice(1)) {
                  const cloned: ts.DefinitionInfo = {
                    ...def,
                    fileName: importedModule.fileName,
                    textSpan: toTextSpan(token.loc),
                    ...(token.declarationLoc ? { contextSpan: toTextSpan(token.declarationLoc) } : {}),
                  };
                  updatedDefinitions.push(cloned);
                }
                resolvedToImported = true;
                break;
              }
            }
          }
          if (resolvedToImported) break;
        }
        if (!resolvedToImported && importedLocs.length > 0) {
          const first = importedLocs[0];
          if (!first) continue;
          const updated: ts.DefinitionInfo = {
            ...def,
            textSpan: toTextSpan(first),
            contextSpan: toTextSpan(first),
          };
          updatedDefinitions.push(updated);
          for (const loc of importedLocs.slice(1)) {
            updatedDefinitions.push({ ...def, textSpan: toTextSpan(loc), contextSpan: toTextSpan(loc) });
          }
          continue;
        }
        updatedDefinitions.push(def);
        continue;
      }
      updatedDefinitions.push(def);
    }
    result.definitions = dedupeDefinitions(updatedDefinitions);
    return result;
  };
}
