import type { CMKConfig } from '@css-modules-kit/core';
import { isComponentFileName } from '@css-modules-kit/core';
import type { Language } from '@volar/language-core';
import ts from 'typescript';
import { isCSSModuleScript } from '../../language-plugin.js';
import { createPreferencesForCompletion } from '../../util.js';

// ref: https://github.com/microsoft/TypeScript/blob/220706eb0320ff46fad8bf80a5e99db624ee7dfb/src/compiler/diagnosticMessages.json
export const CANNOT_FIND_NAME_ERROR_CODE = 2304;
export const PROPERTY_DOES_NOT_EXIST_ERROR_CODE = 2339;

export function getCodeFixesAtPosition(
  language: Language<string>,
  languageService: ts.LanguageService,
  project: ts.server.Project,
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

    if (isComponentFileName(fileName)) {
      // If a user is trying to use a non-existent token (e.g. `styles.nonExistToken`), provide a code fix to add the token.
      if (errorCodes.includes(PROPERTY_DOES_NOT_EXIST_ERROR_CODE)) {
        const tokenConsumer = getTokenConsumerAtPosition(fileName, start, language, languageService, project);
        if (tokenConsumer) {
          prior.push({
            fixName: 'fixMissingCSSRule',
            description: `Add missing CSS rule '.${tokenConsumer.tokenName}'`,
            changes: [createInsertRuleFileChange(tokenConsumer.from, tokenConsumer.tokenName, language)],
          });
        }
      }
    }

    return prior;
  };
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
  language: Language<string>,
  languageService: ts.LanguageService,
  project: ts.server.Project,
): TokenConsumer | undefined {
  const sourceFile = project.getSourceFile(project.projectService.toPath(fileName));
  if (!sourceFile) return undefined;
  const propertyAccessExpression = getPropertyAccessExpressionAtPosition(sourceFile, position);
  if (!propertyAccessExpression) return undefined;

  // Check if the expression of property access expression (e.g. `styles` in `styles.foo`) is imported from a CSS module.

  // `expression` is the expression of the property access expression (e.g. `styles` in `styles.foo`).
  const expression = propertyAccessExpression.expression;

  const definitions = languageService.getDefinitionAtPosition(fileName, expression.getStart());
  if (definitions && definitions[0]) {
    const script = language.scripts.get(definitions[0].fileName);
    if (isCSSModuleScript(script)) {
      return { tokenName: propertyAccessExpression.name.text, from: definitions[0].fileName };
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
