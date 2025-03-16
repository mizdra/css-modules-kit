import dedent from 'dedent';
import selectorParser from 'postcss-selector-parser';
import { describe, expect, test } from 'vitest';
import { fakeRoot, fakeRules } from '../test/ast.js';
import type { DiagnosticPosition } from '../type.js';
import { calcDiagnosticsLocationForSelectorParserNode } from './location.js';

function calcLocations(source: string) {
  const [rule] = fakeRules(fakeRoot(source));
  const root = selectorParser().astSync(rule!);
  const result: { node: string; type: string; start: DiagnosticPosition; end: DiagnosticPosition }[] = [];
  root.walk((node) => {
    const loc = calcDiagnosticsLocationForSelectorParserNode(rule!, node);
    result.push({
      node: node.toString(),
      type: node.type,
      ...loc,
    });
  });
  return result;
}

describe('calcDiagnosticsLocationForSelectorParserNode', () => {
  test('single line', () => {
    const result = calcLocations('.a .b {}');
    expect(result).toMatchInlineSnapshot(`
      [
        {
          "end": {
            "column": 6,
            "line": 1,
          },
          "node": ".a .b",
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
          "type": "selector",
        },
        {
          "end": {
            "column": 3,
            "line": 1,
          },
          "node": ".a",
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
          "type": "class",
        },
        {
          "end": {
            "column": 4,
            "line": 1,
          },
          "node": " ",
          "start": {
            "column": 3,
            "line": 1,
          },
          "type": "combinator",
        },
        {
          "end": {
            "column": 6,
            "line": 1,
          },
          "node": ".b",
          "start": {
            "column": 4,
            "line": 1,
          },
          "type": "class",
        },
      ]
    `);
  });
  test('multiple line', () => {
    const result1 = calcLocations(dedent`
      .a
      .b
        .c {}
    `);
    expect(result1).toMatchInlineSnapshot(`
      [
        {
          "end": {
            "column": 5,
            "line": 3,
          },
          "node": ".a
      .b
        .c",
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
          "type": "selector",
        },
        {
          "end": {
            "column": 3,
            "line": 1,
          },
          "node": ".a",
          "start": {
            "column": 1,
            "line": 1,
            "offset": 0,
          },
          "type": "class",
        },
        {
          "end": {
            "column": 1,
            "line": 2,
          },
          "node": "
      ",
          "start": {
            "column": 3,
            "line": 1,
          },
          "type": "combinator",
        },
        {
          "end": {
            "column": 3,
            "line": 2,
          },
          "node": ".b",
          "start": {
            "column": 1,
            "line": 2,
          },
          "type": "class",
        },
        {
          "end": {
            "column": 3,
            "line": 3,
          },
          "node": "
        ",
          "start": {
            "column": 3,
            "line": 2,
          },
          "type": "combinator",
        },
        {
          "end": {
            "column": 5,
            "line": 3,
          },
          "node": ".c",
          "start": {
            "column": 3,
            "line": 3,
          },
          "type": "class",
        },
      ]
    `);
    const result2 = calcLocations(dedent`
      @import './test.css';
      .a
        .b {}
    `);
    expect(result2).toMatchInlineSnapshot(`
      [
        {
          "end": {
            "column": 5,
            "line": 3,
          },
          "node": ".a
        .b",
          "start": {
            "column": 1,
            "line": 2,
            "offset": 22,
          },
          "type": "selector",
        },
        {
          "end": {
            "column": 3,
            "line": 2,
          },
          "node": ".a",
          "start": {
            "column": 1,
            "line": 2,
            "offset": 22,
          },
          "type": "class",
        },
        {
          "end": {
            "column": 3,
            "line": 3,
          },
          "node": "
        ",
          "start": {
            "column": 3,
            "line": 2,
          },
          "type": "combinator",
        },
        {
          "end": {
            "column": 5,
            "line": 3,
          },
          "node": ".b",
          "start": {
            "column": 3,
            "line": 3,
          },
          "type": "class",
        },
      ]
    `);
  });
});
