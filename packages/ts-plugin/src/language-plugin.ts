import type { CMKConfig, CSSModule, DiagnosticWithLocation, MatchesPattern, Resolver } from '@css-modules-kit/core';
import { createDts, parseCSSModule } from '@css-modules-kit/core';
import type { LanguagePlugin, SourceScript, VirtualCode } from '@volar/language-core';
import type {} from '@volar/typescript';
import ts from 'typescript';

export const LANGUAGE_ID = 'css';

export const CMK_DATA_KEY = Symbol('css-modules-kit-data');

interface CSSModuleVirtualCode extends VirtualCode {
  [CMK_DATA_KEY]: {
    cssModule: CSSModule;
    syntacticDiagnostics: DiagnosticWithLocation[];
  };
}

export interface CSSModuleScript extends SourceScript<string> {
  generated: SourceScript<string>['generated'] & {
    root: CSSModuleVirtualCode;
  };
}

export function createCSSLanguagePlugin(
  resolver: Resolver,
  matchesPattern: MatchesPattern,
  config: CMKConfig,
): LanguagePlugin<string, VirtualCode> {
  return {
    getLanguageId(scriptId) {
      if (!scriptId.endsWith('.css')) return undefined;
      return LANGUAGE_ID;
    },
    createVirtualCode(scriptId, languageId, snapshot): VirtualCode | CSSModuleVirtualCode | undefined {
      if (languageId !== LANGUAGE_ID) return undefined;
      if (!matchesPattern(scriptId)) {
        // `scriptId` is CSS, but not a CSS module.
        // If an empty VirtualCode is not returned for a CSS file, tsserver will treat it as TypeScript code.
        // ref: https://github.com/mizdra/css-modules-kit/issues/170
        return {
          id: 'main',
          languageId,
          snapshot,
          mappings: [],
        };
      }

      const length = snapshot.getLength();
      const cssModuleCode = snapshot.getText(0, length);
      const { cssModule, diagnostics } = parseCSSModule(cssModuleCode, {
        fileName: scriptId,
        // The CSS in the process of being written in an editor often contains invalid syntax.
        // So, ts-plugin uses a fault-tolerant Parser to parse CSS.
        safe: true,
        keyframes: config.keyframes,
      });
      // eslint-disable-next-line prefer-const
      let { text, mapping, linkedCodeMapping } = createDts(
        cssModule,
        { resolver, matchesPattern },
        { ...config, forTsPlugin: true },
      );
      return {
        id: 'main',
        languageId: 'typescript',
        snapshot: {
          getText: (start, end) => text.slice(start, end),
          getLength: () => text.length,
          getChangeRange: () => undefined,
        },
        // `mappings` are required to support "Go to Definition" and renaming
        mappings: [{ ...mapping, data: { navigation: true } }],
        // `linkedCodeMappings` are required to support "Go to Definition" and renaming for the imported tokens
        linkedCodeMappings: [{ ...linkedCodeMapping, data: undefined }],
        [CMK_DATA_KEY]: {
          cssModule,
          syntacticDiagnostics: diagnostics,
        },
      };
    },
    typescript: {
      extraFileExtensions: [
        {
          extension: 'css',
          isMixedContent: true,
          scriptKind: ts.ScriptKind.TS,
        },
      ],
      getServiceScript(root) {
        return {
          code: root,
          extension: ts.Extension.Ts,
          scriptKind: ts.ScriptKind.TS,
        };
      },
    },
  };
}

export function isCSSModuleScript(script: SourceScript<string> | undefined): script is CSSModuleScript {
  return (
    !!script && script.languageId === LANGUAGE_ID && !!script.generated?.root && CMK_DATA_KEY in script.generated.root
  );
}
