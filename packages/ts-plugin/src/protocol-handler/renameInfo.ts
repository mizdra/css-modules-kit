import ts from 'typescript';
import type { CSSModulesKitRenameInfoHandlerResponse, CSSModulesKitRenameInfoRequest } from '../type.js';
import { getConfiguredProjectForFile } from '../util.js';

export function createRenameInfoHandler(projectService: ts.server.ProjectService) {
  return (request: CSSModulesKitRenameInfoRequest): CSSModulesKitRenameInfoHandlerResponse => {
    const { fileName, position } = request.arguments;
    const project = getConfiguredProjectForFile(projectService, fileName);
    if (!project) return {};
    const languageService = project.getLanguageService();
    const preference = project.projectService.getPreferences(ts.server.toNormalizedPath(fileName));
    const result = languageService.getRenameInfo(fileName, position, preference);
    return { response: { result } };
  };
}
