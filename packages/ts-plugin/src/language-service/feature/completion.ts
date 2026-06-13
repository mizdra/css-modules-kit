import type { CMKConfig, Resolver } from '@css-modules-kit/core';
import { getCssModuleFileName, isComponentFileName, isCSSModuleFile, STYLES_EXPORT_NAME } from '@css-modules-kit/core';
import ts from 'typescript';
import { convertDefaultImportsToNamespaceImports, createPreferencesForCompletion } from '../../util.js';
import { getPropertyAccessExpressionAtPosition } from '../ast.js';

const DEFAULT_EXPORT_NAME = 'default';

export function getCompletionsAtPosition(
  languageService: ts.LanguageService,
  config: CMKConfig,
): ts.LanguageService['getCompletionsAtPosition'] {
  return (...args) => {
    const [fileName, position, options, ...rest] = args;
    const prior = languageService.getCompletionsAtPosition(
      fileName,
      position,
      createPreferencesForCompletion(options ?? {}, config),
      ...rest,
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

      // The d.ts adds `export default styles` so that the `styles` binding appears as an auto-import
      // suggestion. As a side effect, the default export leaks into namespace member completions
      // (`import * as styles from './a.module.css'; styles.|`) as a `default` member. The `default`
      // member is not a token of the CSS module, so it is removed.
      if (
        prior.isMemberCompletion &&
        prior.entries.some((entry) => entry.name === DEFAULT_EXPORT_NAME) &&
        isCSSModuleNamespaceAccess(languageService, fileName, position)
      ) {
        prior.entries = prior.entries.filter((entry) => entry.name !== DEFAULT_EXPORT_NAME);
      }
    }
    return prior;
  };
}

/**
 * Check if the completion position accesses a member of a namespace import of a CSS module
 * (e.g. the `styles.|` position in `import * as styles from './a.module.css'; styles.|`).
 */
function isCSSModuleNamespaceAccess(languageService: ts.LanguageService, fileName: string, position: number): boolean {
  const sourceFile = languageService.getProgram()?.getSourceFile(fileName);
  if (!sourceFile) return false;

  const propertyAccess = getPropertyAccessExpressionAtPosition(sourceFile, position);
  if (!propertyAccess) return false;

  // Resolve the accessed expression (e.g. `styles` in `styles.foo`) to its CSS module file.
  // The first definition points to the `styles` binding of `import * as styles from './a.module.css'`
  // in this file, and the second resolves that binding to the CSS module file.
  const [binding] = languageService.getDefinitionAtPosition(fileName, propertyAccess.expression.getStart()) ?? [];
  if (!binding) return false;
  const [moduleDefinition] = languageService.getDefinitionAtPosition(binding.fileName, binding.textSpan.start) ?? [];
  return moduleDefinition !== undefined && isCSSModuleFile(moduleDefinition.fileName);
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
    // oxlint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
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
    // oxlint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
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
  return (...args) => {
    const [fileName] = args;
    const details = languageService.getCompletionEntryDetails(...args);
    if (!details) return undefined;

    if (config.namedExports && !config.prioritizeNamedImports && details.codeActions) {
      convertDefaultImportsToNamespaceImports(details.codeActions, fileName, resolver);
    }
    return details;
  };
}
