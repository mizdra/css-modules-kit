import { convertSyntacticDiagnosticToTSDiagnosticWithLocation } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import type ts from 'typescript';
import { CMK_DATA_KEY, isCSSModuleScript } from '../../language-plugin.js';

export function getSyntacticDiagnostics(
  language: Language<string>,
  languageService: ts.LanguageService,
): ts.LanguageService['getSyntacticDiagnostics'] {
  return (fileName: string) => {
    const prior = languageService.getSyntacticDiagnostics(fileName);
    const script = language.scripts.get(fileName);
    if (isCSSModuleScript(script)) {
      const virtualCode = script.generated.root;
      const diagnostics = virtualCode[CMK_DATA_KEY].syntacticDiagnostics;
      const sourceFile = languageService.getProgram()!.getSourceFile(fileName)!;
      const tsDiagnostics = diagnostics.map((diagnostic) =>
        convertSyntacticDiagnosticToTSDiagnosticWithLocation(diagnostic, () => sourceFile),
      );
      prior.push(...tsDiagnostics);
    }
    return prior;
  };
}
