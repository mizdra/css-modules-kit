import type { CMKConfig, Resolver } from '@css-modules-kit/core';
import { getCssModuleFileName, isComponentFileName, isCSSModuleFile, STYLES_EXPORT_NAME } from '@css-modules-kit/core';
import ts from 'typescript';
import { convertDefaultImportsToNamespaceImports, createPreferencesForCompletion } from '../../util.js';

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
        if (isDefaultExportedStylesEntry(entry) && entry.data.fileName === cssModuleFileName) {
          // Prioritize the completion of the `styles' import for the current .ts file for usability.
          // NOTE: This is a hack to make the completion item appear at the top
          entry.sortText = '0';
        } else if (isClassNamePropEntry(entry)) {
          // Complete `className={...}` instead of `className="..."` for usability.
          entry.insertText = 'className={$1}';
        }
      }
    }
    if (config.namedExports && !config.prioritizeNamedImports) {
      // When `namedExports` is enabled, you can write code as follows:
      // ```tsx
      // import { button } from './a.module.css';
      // const Button = () => <button className={button}>Click me!</button>;
      // ```
      // However, it is more common to use namespace imports for styles.
      // ```tsx
      // import * as styles from './a.module.css';
      // const Button = () => <button className={styles.button}>Click me!</button>;
      // ```
      // Therefore, completion for tokens like `button` is disabled.
      prior.entries = prior.entries.filter((entry) => !isNamedExportedTokenEntry(entry));
    }
    return prior;
  };
}

type DefaultExportedStylesEntry = ts.CompletionEntry & {
  data: ts.CompletionEntryData;
};

/**
 * Check if the completion entry is the default exported `styles` entry.
 */
function isDefaultExportedStylesEntry(entry: ts.CompletionEntry): entry is DefaultExportedStylesEntry {
  return (
    entry.name === STYLES_EXPORT_NAME &&
    entry.data !== undefined &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    entry.data.exportName === ts.InternalSymbolName.Default &&
    entry.data.fileName !== undefined &&
    isCSSModuleFile(entry.data.fileName)
  );
}

/**
 * Check if the completion entry is a named exported token entry.
 */
function isNamedExportedTokenEntry(entry: ts.CompletionEntry): boolean {
  return (
    entry.data !== undefined &&
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    entry.data.exportName !== ts.InternalSymbolName.Default &&
    entry.data.fileName !== undefined &&
    isCSSModuleFile(entry.data.fileName)
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

export function getCompletionEntryDetails(
  languageService: ts.LanguageService,
  resolver: Resolver,
  config: CMKConfig,
): ts.LanguageService['getCompletionEntryDetails'] {
  // eslint-disable-next-line max-params
  return (fileName, position, entryName, formatOptions, source, preferences, data) => {
    const details = languageService.getCompletionEntryDetails(
      fileName,
      position,
      entryName,
      formatOptions,
      source,
      preferences,
      data,
    );
    if (!details) return undefined;

    if (config.namedExports && !config.prioritizeNamedImports && details.codeActions) {
      convertDefaultImportsToNamespaceImports(details.codeActions, fileName, resolver);
    }
    return details;
  };
}
