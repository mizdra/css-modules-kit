import type { CSSModule } from './type.js';

export function isPosixRelativePath(path: string): boolean {
  return path.startsWith(`./`) || path.startsWith(`../`);
}

/** The type of token name violation. */
export type TokenNameViolation =
  | 'proto-not-allowed' // `__proto__` is not allowed
  | 'default-not-allowed' // `default` is not allowed when namedExports is true
  | 'backslash-not-allowed'; // Backslash (`\`) is not allowed

export interface ValidateTokenNameOptions {
  namedExports: boolean;
}

/**
 * Validates a token name and returns the violation if any.
 * @param name The token name to validate.
 * @param options The validation options.
 * @returns The violation, or `undefined` if the name is valid.
 */
export function validateTokenName(name: string, options: ValidateTokenNameOptions): TokenNameViolation | undefined {
  if (name === '__proto__') return 'proto-not-allowed';
  if (options.namedExports && name === 'default') return 'default-not-allowed';
  if (name.includes('\\')) return 'backslash-not-allowed';
  return undefined;
}

/**
 * The syntax pattern for consuming tokens imported from CSS Module.
 * @example `styles.foo`, `styles['foo']`, `styles["foo"]`
 */
// MEMO: The `xxxStyles.foo` format is not supported, because the css module file for current component file is usually imported with `styles`.
//       It is sufficient to support only the `styles.foo` format.
const TOKEN_CONSUMER_PATTERN =
  /styles(?:\.([$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*)|\['([^']*?)'\]|\["([^"]*?)"\])/gu;

/** Returns the set of token names that are considered used. */
export function findUsedTokenNames(componentText: string, cssModule: CSSModule): Set<string> {
  const usedClassNames = new Set<string>();
  for (const match of componentText.matchAll(TOKEN_CONSUMER_PATTERN)) {
    const name = match[1] ?? match[2] ?? match[3];
    if (name) usedClassNames.add(name);
  }
  for (const reference of cssModule.tokenReferences) {
    usedClassNames.add(reference.name);
  }
  return usedClassNames;
}

export function isURLSpecifier(specifier: string): boolean {
  return URL.canParse(specifier);
}
