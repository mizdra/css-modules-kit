import type { CMKConfig } from '@css-modules-kit/core';
import { getCssModuleFileName, isComponentFileName, isCSSModuleFile, STYLES_EXPORT_NAME } from '@css-modules-kit/core';
import ts from 'typescript';

export function getCompletionsAtPosition(
  languageService: ts.LanguageService,
  config: CMKConfig,
): ts.LanguageService['getCompletionsAtPosition'] {
  return (fileName, position, options, formattingSettings) => {
    const prior = languageService.getCompletionsAtPosition(fileName, position, options, formattingSettings);
    if (!prior) return undefined;

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
    if (config.namedExports) {
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
      prior.entries = prior.entries.filter((entry) => !isTokenEntry(entry));
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

function isTokenEntry(entry: ts.CompletionEntry) {
  return entry.source && isCSSModuleFile(entry.source);
}

function isClassNamePropEntry(entry: ts.CompletionEntry) {
  return (
    entry.name === 'className' &&
    entry.kind === ts.ScriptElementKind.memberVariableElement &&
    (entry.insertText === 'className="$1"' || entry.insertText === "className='$1'") &&
    entry.isSnippet
  );
}
