import ts from 'typescript';
import type { NormalizedMapperOptions } from '../options.js';
import type { TransformOutput } from '../transformer.js';
import { transformCSS } from '../transformer.js';

export interface SimplifiedTsDiagnostic {
  code: number;
  fileName: string | undefined;
  start: number | undefined;
  length: number | undefined;
  message: string;
}

const COMPILER_OPTIONS: ts.CompilerOptions = {
  strict: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noUncheckedIndexedAccess: true,
  noPropertyAccessFromIndexSignature: true,
  noImplicitReturns: true,
  exactOptionalPropertyTypes: true,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  noEmit: true,
  skipLibCheck: true,
};

/**
 * Type-checks the generated text of the given CSS Modules with an in-memory program.
 * Each CSS module is registered as `<fileName>.ts`, and import specifiers resolve to
 * those files, mimicking how tsgo resolves `.module.css` imports via a content mapper.
 */
export function checkGeneratedTexts(
  cssFiles: Record<string, string>,
  options: NormalizedMapperOptions,
): { outputs: Record<string, TransformOutput>; diagnostics: SimplifiedTsDiagnostic[] } {
  const outputs: Record<string, TransformOutput> = {};
  const tsFiles = new Map<string, string>();
  for (const [fileName, source] of Object.entries(cssFiles)) {
    const output = transformCSS(fileName, source, options);
    outputs[fileName] = output;
    tsFiles.set(`${fileName}.ts`, output.text);
  }
  const baseHost = ts.createCompilerHost(COMPILER_OPTIONS);
  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists: (fileName) => tsFiles.has(fileName) || baseHost.fileExists(fileName),
    readFile: (fileName) => tsFiles.get(fileName) ?? baseHost.readFile(fileName),
    getSourceFile: (fileName, languageVersionOrOptions) =>
      tsFiles.has(fileName)
        ? ts.createSourceFile(fileName, tsFiles.get(fileName)!, languageVersionOrOptions)
        : baseHost.getSourceFile(fileName, languageVersionOrOptions),
    resolveModuleNameLiterals: (literals, containingFile) =>
      literals.map((literal) => {
        const resolvedFileName = `${resolveSpecifier(containingFile, literal.text)}.ts`;
        if (tsFiles.has(resolvedFileName)) {
          return {
            resolvedModule: { resolvedFileName, extension: ts.Extension.Ts, isExternalLibraryImport: false },
          };
        }
        return { resolvedModule: undefined };
      }),
    writeFile: () => {},
  };
  const program = ts.createProgram([...tsFiles.keys()], COMPILER_OPTIONS, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
    code: diagnostic.code,
    fileName: diagnostic.file?.fileName,
    start: diagnostic.start,
    length: diagnostic.length,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  }));
  return { outputs, diagnostics };
}

function resolveSpecifier(containingFile: string, specifier: string): string {
  const dir = containingFile.slice(0, containingFile.lastIndexOf('/'));
  if (specifier.startsWith('./')) return `${dir}/${specifier.slice(2)}`;
  return specifier;
}
