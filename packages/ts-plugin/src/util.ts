import { type CMKConfig, isCSSModuleFile, type Resolver, STYLES_EXPORT_NAME } from '@css-modules-kit/core';
import ts from 'typescript';

export function createPreferencesForCompletion<T extends ts.UserPreferences>(preferences: T, config: CMKConfig): T {
  // By default, files in `generated/` are included in the completion candidates.
  // To exclude them, we add the `dtsOutDir` to the `autoImportFileExcludePatterns`.
  return {
    ...preferences,
    autoImportFileExcludePatterns: [...(preferences.autoImportFileExcludePatterns ?? []), config.dtsOutDir],
  };
}
/**
 * Convert default imports to namespace imports for CSS modules.
 * For example, convert `import styles from './styles.module.css'` to `import * as styles from './styles.module.css'`.
 */
export function convertDefaultImportsToNamespaceImports(
  codeFixes: ts.CodeFixAction[] | ts.CodeAction[],
  fileName: string,
  resolver: Resolver,
): void {
  for (const codeFix of codeFixes) {
    if ('fixName' in codeFix && codeFix.fixName !== 'import') continue;
    // Check if the code fix is to add an import for a CSS module.
    const match = codeFix.description.match(/^Add import from "(.*)"$/u);
    if (!match) continue;
    const specifier = match[1]!;
    const resolved = resolver(specifier, { request: fileName });
    if (!resolved || !isCSSModuleFile(resolved)) continue;

    // If the specifier is a CSS module, convert the import to a namespace import.
    for (const change of codeFix.changes) {
      for (const textChange of change.textChanges) {
        textChange.newText = textChange.newText.replace(
          `import ${STYLES_EXPORT_NAME} from`,
          `import * as ${STYLES_EXPORT_NAME} from`,
        );
      }
    }
  }
}

export function getConfiguredProjectForFile(
  projectService: ts.server.ProjectService,
  fileName: string,
): ts.server.ConfiguredProject | undefined {
  const project = projectService.getDefaultProjectForFile(ts.server.toNormalizedPath(fileName), false);
  if (!project || project.projectKind !== ts.server.ProjectKind.Configured) return;
  return project as ts.server.ConfiguredProject;
}
