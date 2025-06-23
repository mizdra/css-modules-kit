import ts from 'typescript';
import type { CSSModulesKitRenameHandlerResponse, CSSModulesKitRenameRequest } from '../type.js';
import { getConfiguredProjectForFile } from '../util.js';

export function createRenameHandler(projectService: ts.server.ProjectService) {
  return (request: CSSModulesKitRenameRequest): CSSModulesKitRenameHandlerResponse => {
    const { fileName, position } = request.arguments;
    const project = getConfiguredProjectForFile(projectService, fileName);
    if (!project) return {};
    const languageService = project.getLanguageService();
    const preference = project.projectService.getPreferences(ts.server.toNormalizedPath(fileName));
    const result = languageService.findRenameLocations(fileName, position, false, false, preference);
    return { response: { result } };
  };
}
