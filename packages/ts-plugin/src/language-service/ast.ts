import ts from 'typescript';

/** Get the property access expression at the specified position. (e.g. `obj.foo`, `styles.foo`) */
export function getPropertyAccessExpressionAtPosition(
  sourceFile: ts.SourceFile,
  position: number,
): ts.PropertyAccessExpression | undefined {
  function find(node: ts.Node): ts.PropertyAccessExpression | undefined {
    if (node.pos <= position && position <= node.end && ts.isPropertyAccessExpression(node)) {
      return node;
    }
    return ts.forEachChild(node, find);
  }
  return find(sourceFile);
}
