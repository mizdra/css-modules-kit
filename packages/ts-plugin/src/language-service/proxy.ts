import type { CMKConfig } from '@css-modules-kit/core';
import { createExportBuilder, type MatchesPattern, type Resolver } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import type ts from 'typescript';
import { CMK_DATA_KEY, isCSSModuleScript } from '../language-plugin.js';
import { getCodeFixesAtPosition } from './feature/code-fix.js';
import { getCompletionsAtPosition } from './feature/completion.js';
import { getApplicableRefactors, getEditsForRefactor } from './feature/refactor.js';
import { getSemanticDiagnostics } from './feature/semantic-diagnostic.js';
import { getSyntacticDiagnostics } from './feature/syntactic-diagnostic.js';

// eslint-disable-next-line max-params
export function proxyLanguageService(
  language: Language<string>,
  languageService: ts.LanguageService,
  project: ts.server.Project,
  resolver: Resolver,
  matchesPattern: MatchesPattern,
  config: CMKConfig,
): ts.LanguageService {
  const proxy: ts.LanguageService = Object.create(null);

  for (const k of Object.keys(languageService) as (keyof ts.LanguageService)[]) {
    const x = languageService[k]!;
    // @ts-expect-error - JS runtime trickery which is tricky to type tersely
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    proxy[k] = (...args: {}[]) => x.apply(languageService, args);
  }

  const getCSSModule = (path: string) => {
    const script = language.scripts.get(path);
    if (isCSSModuleScript(script)) {
      return script.generated.root[CMK_DATA_KEY].cssModule;
    }
    return undefined;
  };
  const exportBuilder = createExportBuilder({ getCSSModule, resolver, matchesPattern });

  proxy.getSyntacticDiagnostics = getSyntacticDiagnostics(language, languageService);
  proxy.getSemanticDiagnostics = getSemanticDiagnostics(
    language,
    languageService,
    exportBuilder,
    resolver,
    matchesPattern,
    getCSSModule,
  );
  proxy.getApplicableRefactors = getApplicableRefactors(languageService, project);
  proxy.getEditsForRefactor = getEditsForRefactor(languageService);
  proxy.getCompletionsAtPosition = getCompletionsAtPosition(languageService, config);
  proxy.getCodeFixesAtPosition = getCodeFixesAtPosition(language, languageService, project, config);

  return proxy;
}
