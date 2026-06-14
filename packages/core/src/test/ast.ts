import type { Atrule, CssNode, Declaration, Rule } from 'css-tree';
import { parseCss, walk } from '../parser/csstree.js';

export function fakeRoot(text: string, from?: string): CssNode {
  return parseCss(text, { fileName: from ?? '/test/test.css' });
}

function collectByType<T extends CssNode>(root: CssNode, type: T['type']): T[] {
  const results: T[] = [];
  walk(root, (node) => {
    if (node.type === type) results.push(node as T);
  });
  return results;
}

function collectAtRules(root: CssNode, name: string): Atrule[] {
  return collectByType<Atrule>(root, 'Atrule').filter((atrule) => atrule.name === name);
}

export function fakeAtImports(root: CssNode): Atrule[] {
  return collectAtRules(root, 'import');
}

export function fakeAtValues(root: CssNode): Atrule[] {
  return collectAtRules(root, 'value');
}

export function fakeAtKeyframes(root: CssNode): Atrule[] {
  return collectAtRules(root, 'keyframes');
}

export function fakeRules(root: CssNode): Rule[] {
  return collectByType<Rule>(root, 'Rule');
}

export function fakeDeclaration(css: string): Declaration {
  const [decl] = collectByType<Declaration>(fakeRoot(css), 'Declaration');
  if (decl === undefined) throw new Error('expected a declaration');
  return decl;
}
