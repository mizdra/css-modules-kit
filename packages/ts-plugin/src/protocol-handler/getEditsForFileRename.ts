import ts from 'typescript';
import type {
  CSSModulesKitGetEditsForFileRenameHandlerResponse,
  CSSModulesKitGetEditsForFileRenameRequest,
} from '../type.js';
import { getConfiguredProjectForFile } from '../util.js';

export function createGetEditsForFileRenameHandler(projectService: ts.server.ProjectService) {
  return (request: CSSModulesKitGetEditsForFileRenameRequest): CSSModulesKitGetEditsForFileRenameHandlerResponse => {
    const { oldFilePath, newFilePath } = request.arguments;
    const project = getConfiguredProjectForFile(projectService, oldFilePath);
    if (!project) return {};
    const languageService = project.getLanguageService();
    const formatOptions = projectService.getFormatCodeOptions(ts.server.toNormalizedPath(oldFilePath));
    const preference = projectService.getPreferences(ts.server.toNormalizedPath(oldFilePath));
    const result = languageService.getEditsForFileRename(oldFilePath, newFilePath, formatOptions, preference);
    return { response: { result } };
  };
}
