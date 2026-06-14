import type { ClassSelector as CssClassSelector, CssNode, PseudoClassSelector, Rule } from 'css-tree';
import type { DiagnosticWithDetachedLocation, Location } from '../type.js';
import { toLocation } from './csstree.js';

export interface ClassSelector {
  /** The class name. It does not include the leading dot. */
  name: string;
  /**
   * The location of the class selector.
   * @example `.a {}` has `loc` as `{ start: { line: 1, column: 2, offset: 1 }, end: { line: 1, column: 3, offset: 2 } }`.
   */
  loc: Location;
  /**
   * The location of the declaration of the token in the source file.
   * @example `.a {}` has `declarationLoc` as `{ start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 6, offset: 5 } }`.
   */
  declarationLoc: Location;
}

interface ParseRuleResult {
  classSelectors: ClassSelector[];
  diagnostics: DiagnosticWithDetachedLocation[];
}

type Wrapper = ':local(...)' | ':global(...)' | undefined;

/**
 * Parse a rule and collect local class selectors.
 *
 * The scope handling is based on the behavior of postcss-modules-local-by-default. A class name is local
 * when it is wrapped by `:local(...)` or written without a wrapper (the mode is fixed to 'local'), and
 * global when wrapped by `:global(...)`.
 *
 * @see https://github.com/css-modules/postcss-modules-local-by-default/blob/38119276608ef14821797cfc0242b3c7dead69af/src/index.js
 * @example `.local1 :global(.global1) .local2 :local(.local3)` => `[".local1", ".local2", ".local3"]`
 */
export function parseRule(rule: Rule): ParseRuleResult {
  const classNames: CssClassSelector[] = [];
  const diagnostics: DiagnosticWithDetachedLocation[] = [];

  if (rule.prelude.type === 'SelectorList') {
    visitNode(rule.prelude, undefined);
  }

  const declarationLoc = toLocation(rule.loc!);
  const classSelectors = classNames.map((node) => ({
    name: node.name,
    loc: classNameLoc(node),
    declarationLoc,
  }));
  return { classSelectors, diagnostics };

  function visitNode(node: CssNode, wrappedBy: Wrapper): void {
    if (node.type === 'ClassSelector') {
      // A class name wrapped by `:global(...)` is global. Otherwise it is local, because the mode is fixed to 'local'.
      if (wrappedBy !== ':global(...)') classNames.push(node);
    } else if (node.type === 'PseudoClassSelector') {
      if (node.name === 'local' || node.name === 'global') {
        visitLocalOrGlobal(node, wrappedBy);
      } else if (node.children) {
        // Functional pseudo-classes like `:not(...)` and `:is(...)` keep the current scope for their arguments.
        for (const child of node.children) visitNode(child, wrappedBy);
      }
    } else if (node.type === 'SelectorList' || node.type === 'Selector') {
      for (const child of node.children) visitNode(child, wrappedBy);
    }
  }

  function visitLocalOrGlobal(node: PseudoClassSelector, wrappedBy: Wrapper): void {
    const inner = node.children?.first;
    if (!inner || inner.type !== 'SelectorList') {
      // `:local` or `:global` without arguments. They are complex, so css-modules-kit does not support them.
      diagnostics.push({
        ...detachedLocation(node),
        text: `css-modules-kit does not support \`:${node.name}\`. Use \`:${node.name}(...)\` instead.`,
        category: 'error',
      });
      return;
    }
    if (wrappedBy !== undefined) {
      diagnostics.push({
        ...detachedLocation(node),
        text: `A \`:${node.name}(...)\` is not allowed inside of \`${wrappedBy}\`.`,
        category: 'error',
      });
      return;
    }
    visitNode(inner, node.name === 'local' ? ':local(...)' : ':global(...)');
  }
}

function classNameLoc(node: CssClassSelector): Location {
  const loc = node.loc!;
  // Skip the leading dot, which is always a single character on the same line as the class name.
  return {
    start: { line: loc.start.line, column: loc.start.column + 1, offset: loc.start.offset + 1 },
    end: { line: loc.end.line, column: loc.end.column, offset: loc.end.offset },
  };
}

function detachedLocation(node: CssNode): { start: { line: number; column: number }; length: number } {
  const loc = node.loc!;
  return {
    start: { line: loc.start.line, column: loc.start.column },
    length: loc.end.offset - loc.start.offset,
  };
}
