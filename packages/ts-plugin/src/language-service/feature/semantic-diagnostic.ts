import type { CMKConfig, CSSModule, ExportBuilder, MatchesPattern, Resolver } from '@css-modules-kit/core';
import { checkCSSModule, convertDiagnostic } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import type ts from 'typescript';
import { CMK_DATA_KEY, isCSSModuleScript } from '../../language-plugin.js';

export function getSemanticDiagnostics(
  language: Language<string>,
  languageService: ts.LanguageService,
  exportBuilder: ExportBuilder,
  resolver: Resolver,
  matchesPattern: MatchesPattern,
  getCSSModule: (path: string) => CSSModule | undefined,
  config: CMKConfig,
): ts.LanguageService['getSemanticDiagnostics'] {
  return (...args) => {
    const [fileName] = args;
    const prior = languageService.getSemanticDiagnostics(...args);
    const script = language.scripts.get(fileName);
    if (isCSSModuleScript(script)) {
      const virtualCode = script.generated.root;
      const cssModule = virtualCode[CMK_DATA_KEY];

      // Clear cache to update export records for all files
      exportBuilder.clearCache();

      const diagnostics = checkCSSModule(cssModule, {
        config,
        getExportRecord: (m) => exportBuilder.build(m),
        matchesPattern,
        resolver,
        getCSSModule,
      });
      const sourceFile = languageService.getProgram()!.getSourceFile(fileName)!;
      const tsDiagnostics = diagnostics.map((diagnostic) => convertDiagnostic(diagnostic, () => sourceFile));
      prior.push(...tsDiagnostics);
    }
    return prior;
  };
}
