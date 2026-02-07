export function isPosixRelativePath(path: string): boolean {
  return path.startsWith(`./`) || path.startsWith(`../`);
}

const JS_IDENTIFIER_PATTERN = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u;

/** The type of token name violation. */
export type TokenNameViolation =
  | 'invalid-js-identifier' // Invalid as a JavaScript identifier
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
  if (options.namedExports) {
    if (name === 'default') return 'default-not-allowed';
    if (!JS_IDENTIFIER_PATTERN.test(name)) return 'invalid-js-identifier';
  } else {
    if (name.includes('\\')) return 'backslash-not-allowed';
  }
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

export function findUsedTokenNames(componentText: string): Set<string> {
  const usedClassNames = new Set<string>();
  for (const match of componentText.matchAll(TOKEN_CONSUMER_PATTERN)) {
    const name = match[1] ?? match[2] ?? match[3];
    if (name) usedClassNames.add(name);
  }
  return usedClassNames;
}

export function isURLSpecifier(specifier: string): boolean {
  return URL.canParse(specifier);
}
