import type { CMKConfig } from '@css-modules-kit/core';
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
