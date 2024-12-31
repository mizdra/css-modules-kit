import type { AtRule } from 'postcss';
import { AtValueInvalidError } from '../error.js';
import type { Location } from './location.js';

interface ValueDeclaration {
  type: 'valueDeclaration';
  name: string;
  // value: string; // unused
  loc: Location;
}

interface ValueImportDeclaration {
  type: 'valueImportDeclaration';
  values: { name: string; localName?: string }[];
  from: string;
}

type ParsedAtValue = ValueDeclaration | ValueImportDeclaration;

const matchImports = /^(.+?)\s+from\s+("[^"]*"|'[^']*')$/du;
const matchValueDefinition = /(?:\s+|^)([\w-]+):?(.*?)$/du;
const matchImport = /^([\w-]+)(?:\s+as\s+([\w-]+))?/u;

/**
 * Parse the `@value` rule.
 * Forked from https://github.com/css-modules/postcss-modules-values/blob/v4.0.0/src/index.js.
 *
 * @throws {AtValueInvalidError}
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
// MEMO: honey-css-modules does not support `@value` with parentheses (e.g., `@value (a, b) from ',,,';`) to simplify the implementation.
// MEMO: honey-css-modules does not support `@value` with variable module name (e.g., `@value a from moduleName;`) to simplify the implementation.
export function parseAtValue(atValue: AtRule): ParsedAtValue {
  const matchesForImports = atValue.params.match(matchImports);
  if (matchesForImports) {
    const [, aliases, path] = matchesForImports;

    if (aliases === undefined || path === undefined) throw new Error('unreachable: `aliases` or `path` is undefined');

    const values = aliases.split(/\s*,\s*/u).map((alias) => {
      const tokens = matchImport.exec(alias);

      if (tokens) {
        const [, name, localName] = tokens;
        if (name === undefined) throw new Error('unreachable: `name` is undefined');
        return localName === undefined ? { name } : { name, localName };
      } else {
        throw new AtValueInvalidError(atValue);
      }
    });

    // Remove quotes from the path.
    const normalizedPath = path.replace(/^['"]|['"]$/gu, '');

    return { type: 'valueImportDeclaration', values, from: normalizedPath };
  }

  const matchesForValueDefinitions = `${atValue.params}${atValue.raws.between!}`.match(matchValueDefinition);
  if (matchesForValueDefinitions) {
    const [, name, _value] = matchesForValueDefinitions;
    if (name === undefined) throw new Error(`unreachable`);
    /** The index of the `<name>` in `@value <name>: <value>;`. */
    const nameIndex = 6 + (atValue.raws.afterName?.length ?? 0) + matchesForValueDefinitions.indices![1]![0];
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
    return { type: 'valueDeclaration', name, loc: { start, end } };
  }
  throw new AtValueInvalidError(atValue);
}
