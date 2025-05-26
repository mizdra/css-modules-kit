import { type CMKConfig, isCSSModuleFile, type Resolver, STYLES_EXPORT_NAME } from '@css-modules-kit/core';
import ts from 'typescript';

/** The error code used by tsserver to display the css-modules-kit error in the editor. */
// NOTE: Use any other number than 1002 or later, as they are reserved by TypeScript's built-in errors.
// ref: https://github.com/microsoft/TypeScript/blob/220706eb0320ff46fad8bf80a5e99db624ee7dfb/src/compiler/diagnosticMessages.json
export const TS_ERROR_CODE_FOR_CMK_ERROR = 0;

export function convertErrorCategory(category: 'error' | 'warning' | 'suggestion'): ts.DiagnosticCategory {
  switch (category) {
    case 'error':
      return ts.DiagnosticCategory.Error;
    case 'warning':
      return ts.DiagnosticCategory.Warning;
    case 'suggestion':
      return ts.DiagnosticCategory.Suggestion;
    default:
      throw new Error(`Unknown category: ${String(category)}`);
  }
}

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
