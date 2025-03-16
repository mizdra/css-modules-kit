import type { Rule } from 'postcss';
import type selectorParser from 'postcss-selector-parser';
import type { DiagnosticPosition } from '../type.js';

export interface Position {
  /**
   * The line number in the source file. It is 1-based.
   * This is compatible with postcss and tsserver.
   */
  line: number;
  /**
   * The column number in the source file. It is 1-based.
   * This is compatible with postcss and tsserver.
   */
  column: number;
  /** The offset in the source file. It is 0-based. */
  offset: number;
}

export interface Location {
  /**
   * The starting position of the node. It is inclusive.
   * This is compatible with postcss and tsserver.
   */
  start: Position;
  /**
   * The ending position of the node. It is exclusive.
   * This is compatible with tsserver, but not postcss.
   */
  end: Position;
}

export function calcDiagnosticsLocationForSelectorParserNode(
  rule: Rule,
  node: selectorParser.Node,
): { start: DiagnosticPosition; end: DiagnosticPosition } {
  const start = rule.positionBy({ index: node.sourceIndex });
  const end = rule.positionBy({ index: node.sourceIndex + node.toString().length });
  return { start, end };
}
