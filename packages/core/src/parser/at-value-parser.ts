import type { AtRule } from 'postcss';
import type { DetachedSyntacticDiagnostic, DiagnosticPosition, Location } from '../type.js';

interface ValueDeclaration {
  type: 'valueDeclaration';
  name: string;
  // value: string; // unused
  loc: Location;
}

interface ValueImportDeclaration {
  type: 'valueImportDeclaration';
  values: {
    name: string;
    loc: Location;
    localName?: string;
    localLoc?: Location;
  }[];
  from: string;
  fromLoc: Location;
}

type ParsedAtValue = ValueDeclaration | ValueImportDeclaration;

interface ParseAtValueResult {
  atValue?: ParsedAtValue;
  diagnostics: DetachedSyntacticDiagnostic[];
}

const VALUE_IMPORT_PATTERN = /^(.+?)\s+from\s+("[^"]*"|'[^']*')$/du;
const VALUE_DEFINITION_PATTERN = /(?:\s+|^)([\w-]+):?(.*?)$/du;
const IMPORTED_ITEM_PATTERN = /^([\w-]+)(?:\s+as\s+([\w-]+))?/du;

/**
 * Parse the `@value` rule.
 * Forked from https://github.com/css-modules/postcss-modules-values/blob/v4.0.0/src/index.js.
 *
 * @license
 * ISC License (ISC)
 * Copyright (c) 2015, Glen Maddern
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted,
 * provided that the above copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING
 * ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
 * WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH
 * THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
// MEMO: css-modules-kit does not support `@value` with parentheses (e.g., `@value (a, b) from '...';`) to simplify the implementation.
// MEMO: css-modules-kit does not support `@value` with variable module name (e.g., `@value a from moduleName;`) to simplify the implementation.
export function parseAtValue(atValue: AtRule): ParseAtValueResult {
  const matchesForValueImport = atValue.params.match(VALUE_IMPORT_PATTERN);
  const diagnostics: DetachedSyntacticDiagnostic[] = [];
  if (matchesForValueImport) {
    const [, importedItems, from] = matchesForValueImport as [string, string, string];
    // The length of the `@value  ` part in `@value  import1 from '...'`
    const baseLength = 6 + (atValue.raws.afterName?.length ?? 0);

    let lastItemIndex = 0;
    const values: ValueImportDeclaration['values'] = [];
    for (const alias of importedItems.split(/\s*,\s*/u)) {
      const currentItemIndex = importedItems.indexOf(alias, lastItemIndex);
      lastItemIndex = currentItemIndex;
      const matchesForImportedItem = alias.match(IMPORTED_ITEM_PATTERN);

      if (matchesForImportedItem) {
        const [, name, localName] = matchesForImportedItem as [string, string, string | undefined];
        const nameIndex = matchesForImportedItem.indices![1]![0];
        const start = {
          line: atValue.source!.start!.line,
          column: atValue.source!.start!.column + baseLength + currentItemIndex + nameIndex,
          offset: atValue.source!.start!.offset + baseLength + currentItemIndex + nameIndex,
        };
        const end = {
          line: start.line,
          column: start.column + name.length,
          offset: start.offset + name.length,
        };
        const result = { name, loc: { start, end } };
        if (localName === undefined) {
          values.push(result);
        } else {
          const localNameIndex = matchesForImportedItem.indices![2]![0];
          const start = {
            line: atValue.source!.start!.line,
            column: atValue.source!.start!.column + baseLength + currentItemIndex + localNameIndex,
            offset: atValue.source!.start!.offset + baseLength + currentItemIndex + localNameIndex,
          };
          const end = {
            line: start.line,
            column: start.column + localName.length,
            offset: start.offset + localName.length,
          };
          values.push({ ...result, localName, localLoc: { start, end } });
        }
      } else {
        const start: DiagnosticPosition = {
          line: atValue.source!.start!.line,
          column: atValue.source!.start!.column + baseLength + currentItemIndex,
        };
        const end: DiagnosticPosition = {
          line: start.line,
          column: start.column + alias.length,
        };
        diagnostics.push({
          start,
          end,
          text: `\`${alias}\` is invalid syntax.`,
          category: 'error',
        });
      }
    }

    // `from` is surrounded by quotes (e.g., `"./test.module.css"`). So, remove the quotes.
    const normalizedFrom = from.slice(1, -1);

    const fromIndex = matchesForValueImport.indices![2]![0] + 1;
    const start = {
      line: atValue.source!.start!.line,
      column: atValue.source!.start!.column + baseLength + fromIndex,
      offset: atValue.source!.start!.offset + baseLength + fromIndex,
    };
    const end = {
      line: start.line,
      column: start.column + normalizedFrom.length,
      offset: start.offset + normalizedFrom.length,
    };

    const parsedAtValue: ValueImportDeclaration = {
      type: 'valueImportDeclaration',
      values,
      from: normalizedFrom,
      fromLoc: { start, end },
    };
    return { atValue: parsedAtValue, diagnostics };
  }

  const matchesForValueDefinition = `${atValue.params}${atValue.raws.between!}`.match(VALUE_DEFINITION_PATTERN);
  if (matchesForValueDefinition) {
    const [, name, _value] = matchesForValueDefinition;
    if (name === undefined) throw new Error(`unreachable`);
    /** The index of the `<name>` in `@value <name>: <value>;`. */
    const nameIndex = 6 + (atValue.raws.afterName?.length ?? 0) + matchesForValueDefinition.indices![1]![0];
    const start = {
      line: atValue.source!.start!.line,
      column: atValue.source!.start!.column + nameIndex,
      offset: atValue.source!.start!.offset + nameIndex,
    };
    const end = {
      line: start.line,
      column: start.column + name.length,
      offset: start.offset + name.length,
    };
    const parsedAtValue = { type: 'valueDeclaration', name, loc: { start, end } } as const;
    return { atValue: parsedAtValue, diagnostics };
  }
  diagnostics.push({
    start: {
      line: atValue.source!.start!.line,
      column: atValue.source!.start!.column,
    },
    end: {
      line: atValue.source!.end!.line,
      column: atValue.source!.end!.column + 1,
    },
    text: `\`${atValue.toString()}\` is a invalid syntax.`,
    category: 'error',
  });
  return { diagnostics };
}
