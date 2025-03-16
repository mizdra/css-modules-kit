import type { CSSModule, ExportBuilder, MatchesPattern, Resolver } from '@css-modules-kit/core';
import { checkCSSModule, convertDiagnostic } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import type ts from 'typescript';
import { CMK_DATA_KEY, isCSSModuleScript } from '../../language-plugin.js';

// eslint-disable-next-line max-params
export function getSemanticDiagnostics(
  language: Language<string>,
  languageService: ts.LanguageService,
  exportBuilder: ExportBuilder,
  resolver: Resolver,
  matchesPattern: MatchesPattern,
  getCSSModule: (path: string) => CSSModule | undefined,
): ts.LanguageService['getSemanticDiagnostics'] {
  return (fileName: string) => {
    const prior = languageService.getSemanticDiagnostics(fileName);
    const script = language.scripts.get(fileName);
    if (isCSSModuleScript(script)) {
      const virtualCode = script.generated.root;
      const cssModule = virtualCode[CMK_DATA_KEY].cssModule;

      // Clear cache to update export records for all files
      exportBuilder.clearCache();

      const diagnostics = checkCSSModule(cssModule, exportBuilder, matchesPattern, resolver, getCSSModule);
      const sourceFile = languageService.getProgram()!.getSourceFile(fileName)!;
      const tsDiagnostics = diagnostics.map((diagnostic) => convertDiagnostic(diagnostic, () => sourceFile));
      prior.push(...tsDiagnostics);
    }
    return prior;
  };
}
