import type { CMKConfig, Resolver } from '@css-modules-kit/core';
import { isComponentFileName, isCSSModuleFile } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import ts from 'typescript';
import { convertDefaultImportsToNamespaceImports, createPreferencesForCompletion } from '../../util.js';

// ref: https://github.com/microsoft/TypeScript/blob/220706eb0320ff46fad8bf80a5e99db624ee7dfb/src/compiler/diagnosticMessages.json
export const CANNOT_FIND_NAME_ERROR_CODE = 2304;
export const PROPERTY_DOES_NOT_EXIST_ERROR_CODES: [number, number] = [2339, 2551];

export function getCodeFixesAtPosition(
  language: Language<string>,
  languageService: ts.LanguageService,
  project: ts.server.Project,
  resolver: Resolver,
  config: CMKConfig,
): ts.LanguageService['getCodeFixesAtPosition'] {
  // eslint-disable-next-line max-params
  return (fileName, start, end, errorCodes, formatOptions, preferences) => {
    const prior = Array.from(
      languageService.getCodeFixesAtPosition(
        fileName,
        start,
        end,
        errorCodes,
        formatOptions,
        createPreferencesForCompletion(preferences, config),
      ),
    );

    if (config.namedExports && !config.prioritizeNamedImports) {
      convertDefaultImportsToNamespaceImports(prior, fileName, resolver);
      excludeNamedImports(prior, fileName, resolver);
    }

    if (isComponentFileName(fileName)) {
      // If a user is trying to use a non-existent token (e.g. `styles.nonExistToken`), provide a code fix to add the token.
      if (errorCodes.some((errorCode) => PROPERTY_DOES_NOT_EXIST_ERROR_CODES.includes(errorCode))) {
        const tokenConsumer = getTokenConsumerAtPosition(fileName, start, languageService, project, config);
        if (tokenConsumer) {
          prior.push({
            fixName: 'fixMissingCSSRule',
            description: `Add missing CSS rule '.${tokenConsumer.tokenName}'`,
            changes: [createInsertRuleFileChange(tokenConsumer.from, tokenConsumer.tokenName, language)],
          });
        }
      }
    }

    return prior.filter((codeFix) => codeFix.changes.length > 0);
  };
}

/**
 * Exclude code fixes that add named imports (e.g. `import { foo } from './a.module.css'`)
 */
function excludeNamedImports(codeFixes: ts.CodeFixAction[], fileName: string, resolver: Resolver): void {
  for (const codeFix of codeFixes) {
    if (codeFix.fixName !== 'import') continue;
    const match = codeFix.description.match(/^Add import from "(.*)"$/u);
    if (!match) continue;
    const specifier = match[1]!;
    const resolved = resolver(specifier, { request: fileName });
    if (!resolved || !isCSSModuleFile(resolved)) continue;

    for (const change of codeFix.changes) {
      change.textChanges = change.textChanges.filter((textChange) => !textChange.newText.startsWith(`import {`));
    }
    codeFix.changes = codeFix.changes.filter((change) => change.textChanges.length > 0);
  }
}

interface TokenConsumer {
  /** The token name (e.g. `foo` in `styles.foo`) */
  tokenName: string;
  /** The file path of the CSS module that defines the token */
  from: string;
}

/**
 * Get the token consumer at the specified position.
 * If the position is at `styles.foo`, it returns `{ tokenName: 'foo', from: '/path/to/a.module.css' }`.
 */
function getTokenConsumerAtPosition(
  fileName: string,
  position: number,
  languageService: ts.LanguageService,
  project: ts.server.Project,
  config: CMKConfig,
): TokenConsumer | undefined {
  const sourceFile = project.getSourceFile(project.projectService.toPath(fileName));
  if (!sourceFile) return undefined;
  const propertyAccessExpression = getPropertyAccessExpressionAtPosition(sourceFile, position);
  if (!propertyAccessExpression) return undefined;

  // Check if the expression of property access expression (e.g. `styles` in `styles.foo`) is imported from a CSS module.

  // `expression` is the expression of the property access expression (e.g. `styles` in `styles.foo`).
  const expression = propertyAccessExpression.expression;

  let [definition] = languageService.getDefinitionAtPosition(fileName, expression.getStart()) ?? [];
  if (!definition) return undefined;

  // `definition` is may be `styles` definition in CSS Modules file.
  if (isCSSModuleFile(definition.fileName)) {
    return { tokenName: propertyAccessExpression.name.text, from: definition.fileName };
  } else if (config.namedExports) {
    // If namespaced import is used, it may be a definition in a component file
    // (e.g. the `styles` of `import * as styles from './a.module.css'`).
    // In that case, we need to call `getDefinitionAtPosition` again to get the definition in CSS module file.
    [definition] = languageService.getDefinitionAtPosition(definition.fileName, definition.textSpan.start) ?? [];
    if (definition && isCSSModuleFile(definition.fileName)) {
      return { tokenName: propertyAccessExpression.name.text, from: definition.fileName };
    }
  }
  return undefined;
}

/** Get the property access expression at the specified position. (e.g. `obj.foo`, `styles.foo`) */
function getPropertyAccessExpressionAtPosition(
  sourceFile: ts.SourceFile,
  position: number,
): ts.PropertyAccessExpression | undefined {
  function getPropertyAccessExpressionImpl(node: ts.Node): ts.PropertyAccessExpression | undefined {
    if (node.pos <= position && position <= node.end && ts.isPropertyAccessExpression(node)) {
      return node;
    }
    return ts.forEachChild(node, getPropertyAccessExpressionImpl);
  }
  return getPropertyAccessExpressionImpl(sourceFile);
}

function createInsertRuleFileChange(
  cssModuleFileName: string,
  className: string,
  language: Language<string>,
): ts.FileTextChanges {
  const script = language.scripts.get(cssModuleFileName);
  if (script) {
    return {
      fileName: cssModuleFileName,
      textChanges: [{ span: { start: script.snapshot.getLength(), length: 0 }, newText: `\n.${className} {\n  \n}` }],
      isNewFile: false,
    };
  } else {
    return {
      fileName: cssModuleFileName,
      textChanges: [{ span: { start: 0, length: 0 }, newText: `.${className} {\n  \n}\n\n` }],
      isNewFile: true,
    };
  }
}
