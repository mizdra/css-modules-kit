import type { Resolver } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import type ts from 'typescript';
import { CMK_DATA_KEY, isCSSModuleScript } from '../language-plugin.js';
import type {
  CSSModulesKitDocumentLinkHandlerResponse,
  CSSModulesKitDocumentLinkRequest,
  DocumentLink,
} from '../type.js';
import { getConfiguredProjectForFile } from '../util.js';

export function createDocumentLinkHandler(
  projectService: ts.server.ProjectService,
  projectToLanguage: WeakMap<ts.server.Project, Language<string>>,
  resolver: Resolver,
) {
  return (request: CSSModulesKitDocumentLinkRequest): CSSModulesKitDocumentLinkHandlerResponse => {
    const { fileName } = request.arguments;
    const project = getConfiguredProjectForFile(projectService, fileName);
    if (!project) return {};
    const language = projectToLanguage.get(project);
    if (!language) return {};
    const script = language.scripts.get(fileName);
    const links: DocumentLink[] = [];
    if (isCSSModuleScript(script)) {
      const { tokenImporters } = script.generated.root[CMK_DATA_KEY];
      for (const { from, fromLoc } of tokenImporters) {
        const resolved = resolver(from, { request: fileName });
        if (!resolved) continue;
        links.push({
          fileName: resolved,
          textSpan: { start: fromLoc.start.offset, length: fromLoc.end.offset - fromLoc.start.offset },
        });
      }
    }
    return { response: { result: links } };
  };
}
