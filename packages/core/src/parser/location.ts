import type { Rule } from 'postcss';
import type selectorParser from 'postcss-selector-parser';
import type { DiagnosticPosition } from '../type.js';

export function calcDiagnosticsLocationForSelectorParserNode(
  rule: Rule,
  node: selectorParser.Node,
): { start: DiagnosticPosition; end: DiagnosticPosition } {
  const start = rule.positionBy({ index: node.sourceIndex });
  const end = rule.positionBy({ index: node.sourceIndex + node.toString().length });
  return { start, end };
}
