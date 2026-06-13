import type { AtRule } from 'postcss';
import postcssValueParser from 'postcss-value-parser';
import type { DiagnosticWithDetachedLocation, Location } from '../type.js';

interface ValueDeclaration {
  type: 'declaration';
  name: string;
  // value: string; // unused
  loc: Location;
  /**
   * NOTE: The `declarationLoc` for value declaration does not include the trailing semicolon.
   * @example `@value white: #fff` has `declarationLoc` as `{ start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 19, offset: 18 } }`.
   */
  declarationLoc: Location;
}

interface ValueImporter {
  type: 'importer';
  entries: {
    name: string;
    loc: Location;
    localName?: string;
    localLoc?: Location;
  }[];
  from: string;
  fromLoc: Location;
}

type ParsedAtValue = ValueDeclaration | ValueImporter;

interface ParseAtValueResult {
  atValue?: ParsedAtValue;
  diagnostics: DiagnosticWithDetachedLocation[];
}

/**
 * Parse the `@value` rule.
 *
 * MEMO: css-modules-kit does not support `@value` with parentheses (e.g., `@value (a, b) from '...';`) to simplify the implementation.
 * MEMO: css-modules-kit does not support `@value` with variable module name (e.g., `@value a from moduleName;`) to simplify the implementation.
 */
export function parseAtValue(atValue: AtRule): ParseAtValueResult {
  const nodes = postcssValueParser(atValue.params).nodes;
  if (isValueImport(nodes)) {
    return parseValueImport(atValue, nodes);
  }
  return parseValueDeclaration(atValue, nodes);
}

/**
 * Check that the params form a value import: one or more nodes followed by `from`
 * and a single quoted specifier (e.g. `'./test.module.css'`).
 */
function isValueImport(nodes: postcssValueParser.Node[]): boolean {
  const fromIndex = findFromKeywordIndex(nodes);
  if (fromIndex < 1) return false;
  const tail = nodes.slice(fromIndex + 1).filter((node) => node.type !== 'space');
  return tail.length === 1 && tail[0]!.type === 'string';
}

function findFromKeywordIndex(nodes: postcssValueParser.Node[]): number {
  return nodes.findLastIndex((node) => node.type === 'word' && node.value === 'from');
}

function parseValueImport(atValue: AtRule, nodes: postcssValueParser.Node[]): ParseAtValueResult {
  const fromIndex = findFromKeywordIndex(nodes);
  const specifierNode = nodes.slice(fromIndex + 1).find((node) => node.type === 'string')!;

  const entries: ValueImporter['entries'] = [];
  const diagnostics: DiagnosticWithDetachedLocation[] = [];
  for (const item of splitByComma(nodes.slice(0, fromIndex))) {
    const words = item.nodes.filter((node) => node.type === 'word');
    const nameNode = words[0];
    // An empty item (e.g. the middle item in `a,,b`) has no name, so report it like `@value;`.
    if (nameNode === undefined) {
      const { start } = calcAtValueParamsLoc(atValue, item.sourceIndex, 0);
      diagnostics.push({
        start: { line: start.line, column: start.column },
        length: 0,
        text: '`` is invalid syntax.',
        category: 'error',
      });
      continue;
    }
    const entry: ValueImporter['entries'][number] = {
      name: nameNode.value,
      loc: calcAtValueParamsLoc(atValue, nameNode.sourceIndex, nameNode.value.length),
    };
    const localNode = words[1]?.value === 'as' ? words[2] : undefined;
    if (localNode !== undefined) {
      entry.localName = localNode.value;
      entry.localLoc = calcAtValueParamsLoc(atValue, localNode.sourceIndex, localNode.value.length);
    }
    entries.push(entry);
  }

  const parsedAtValue: ValueImporter = {
    type: 'importer',
    entries,
    from: specifierNode.value,
    // The location of the specifier without quotes.
    fromLoc: calcAtValueParamsLoc(atValue, specifierNode.sourceIndex + 1, specifierNode.value.length),
  };
  return { atValue: parsedAtValue, diagnostics };
}

function parseValueDeclaration(atValue: AtRule, nodes: postcssValueParser.Node[]): ParseAtValueResult {
  const nameNode = nodes.find((node) => node.type !== 'space');
  if (nameNode === undefined || nameNode.type !== 'word') {
    return {
      diagnostics: [
        {
          start: {
            line: atValue.source!.start!.line,
            column: atValue.source!.start!.column,
          },
          length: atValue.source!.end!.offset - atValue.source!.start!.offset,
          text: `\`${atValue.toString()}\` is a invalid syntax.`,
          category: 'error',
        },
      ],
    };
  }
  const parsedAtValue: ValueDeclaration = {
    type: 'declaration',
    name: nameNode.value,
    loc: calcAtValueParamsLoc(atValue, nameNode.sourceIndex, nameNode.value.length),
    declarationLoc: {
      start: atValue.source!.start!,
      end: atValue.positionBy({ index: atValue.toString().length }),
    },
  };
  return { atValue: parsedAtValue, diagnostics: [] };
}

/**
 * Calculate the location of a range in the params of an at-rule.
 * @param sourceIndex The index of the range in the params.
 * @param length The length of the range.
 */
function calcAtValueParamsLoc(atValue: AtRule, sourceIndex: number, length: number): Location {
  const baseLength = 1 + atValue.name.length + (atValue.raws.afterName?.length ?? 0);
  const startIndex = baseLength + sourceIndex;
  return {
    start: atValue.positionBy({ index: startIndex }),
    end: atValue.positionBy({ index: startIndex + length }),
  };
}

interface ImportItem {
  nodes: postcssValueParser.Node[];
  /** The source index where the item begins, used to locate an empty item. */
  sourceIndex: number;
}

/** Split the nodes by top-level commas. Space nodes are dropped. */
function splitByComma(nodes: postcssValueParser.Node[]): ImportItem[] {
  const items: ImportItem[] = [{ nodes: [], sourceIndex: 0 }];
  for (const node of nodes) {
    if (node.type === 'div' && node.value === ',') {
      items.push({ nodes: [], sourceIndex: node.sourceEndIndex });
    } else if (node.type !== 'space') {
      items.at(-1)!.nodes.push(node);
    }
  }
  return items;
}
