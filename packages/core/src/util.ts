export function isPosixRelativePath(path: string): boolean {
  return path.startsWith(`./`) || path.startsWith(`../`);
}

export const JS_IDENTIFIER_PATTERN = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u;

/**
 * The syntax pattern for consuming tokens imported from CSS Module.
 * @example `styles.foo`
 */
// TODO(#125): Support `styles['foo']` and `styles["foo"]`
// MEMO: The `xxxStyles.foo` format is not supported, because the css module file for current component file is usually imported with `styles`.
//       It is sufficient to support only the `styles.foo` format.
const TOKEN_CONSUMER_PATTERN = /styles\.([$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*)/gu;

export function findUsedTokenNames(componentText: string): Set<string> {
  const usedClassNames = new Set<string>();
  let match;
  while ((match = TOKEN_CONSUMER_PATTERN.exec(componentText)) !== null) {
    usedClassNames.add(match[1]!);
  }
  return usedClassNames;
}
