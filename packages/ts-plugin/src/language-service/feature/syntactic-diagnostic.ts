import type { SyntacticDiagnostic } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import ts from 'typescript';
import { CMK_DATA_KEY, isCSSModuleScript } from '../../language-plugin.js';
import { convertErrorCategory, TS_ERROR_CODE_FOR_CMK_ERROR } from '../../util.js';

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
      const tsDiagnostics = diagnostics.map((diagnostic) => convertDiagnostic(diagnostic, sourceFile));
      prior.push(...tsDiagnostics);
    }
    return prior;
  };
}

function convertDiagnostic(diagnostic: SyntacticDiagnostic, sourceFile: ts.SourceFile): ts.DiagnosticWithLocation {
  const start = ts.getPositionOfLineAndCharacter(sourceFile, diagnostic.start.line - 1, diagnostic.start.column - 1);
  const length =
    diagnostic.end ?
      ts.getPositionOfLineAndCharacter(sourceFile, diagnostic.end.line - 1, diagnostic.end.column - 1) - start
    : 1;
  return {
    file: sourceFile,
    start,
    category: convertErrorCategory(diagnostic.category),
    length,
    messageText: diagnostic.text,
    code: TS_ERROR_CODE_FOR_CMK_ERROR,
  };
}
