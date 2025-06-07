import type { CMKConfig } from '@css-modules-kit/core';
import { getCssModuleFileName, isComponentFileName, STYLES_EXPORT_NAME } from '@css-modules-kit/core';
import ts from 'typescript';
import { createPreferencesForCompletion } from '../../util.js';

export function getCompletionsAtPosition(
  languageService: ts.LanguageService,
  config: CMKConfig,
): ts.LanguageService['getCompletionsAtPosition'] {
  return (fileName, position, options, formattingSettings) => {
    const prior = languageService.getCompletionsAtPosition(
      fileName,
      position,
      createPreferencesForCompletion(options ?? {}, config),
      formattingSettings,
    );

    if (!prior) return;

    if (isComponentFileName(fileName)) {
      const cssModuleFileName = getCssModuleFileName(fileName);
      for (const entry of prior.entries) {
        if (isStylesEntryForCSSModuleFile(entry, cssModuleFileName)) {
          // Prioritize the completion of the `styles' import for the current .ts file for usability.
          // NOTE: This is a hack to make the completion item appear at the top
          entry.sortText = '0';
        } else if (isClassNamePropEntry(entry)) {
          // Complete `className={...}` instead of `className="..."` for usability.
          entry.insertText = 'className={$1}';
        }
      }
    }
    return prior;
  };
}

/**
 * Check if the completion entry is the `styles` entry for the CSS module file.
 */
function isStylesEntryForCSSModuleFile(entry: ts.CompletionEntry, cssModuleFileName: string) {
  return (
    entry.name === STYLES_EXPORT_NAME &&
    entry.data &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    entry.data.exportName === ts.InternalSymbolName.Default &&
    entry.data.fileName &&
    entry.data.fileName === cssModuleFileName
  );
}

function isClassNamePropEntry(entry: ts.CompletionEntry) {
  return (
    entry.name === 'className' &&
    entry.kind === ts.ScriptElementKind.memberVariableElement &&
    (entry.insertText === 'className="$1"' || entry.insertText === "className='$1'") &&
    entry.isSnippet
  );
}
