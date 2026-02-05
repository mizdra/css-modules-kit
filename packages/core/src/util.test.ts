import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { findUsedTokenNames, validateTokenName } from './util.js';

describe('validateTokenName', () => {
  test('returns undefined for valid token name', () => {
    expect(validateTokenName('validName', { namedExports: false })).toBe(undefined);
    expect(validateTokenName('validName', { namedExports: true })).toBe(undefined);
  });
  test('returns "proto-not-allowed" for __proto__', () => {
    expect(validateTokenName('__proto__', { namedExports: false })).toBe('proto-not-allowed');
    expect(validateTokenName('__proto__', { namedExports: true })).toBe('proto-not-allowed');
  });
  test('returns "default-not-allowed" for default when namedExports is true', () => {
    expect(validateTokenName('default', { namedExports: true })).toBe('default-not-allowed');
  });
  test('returns undefined for default when namedExports is false', () => {
    expect(validateTokenName('default', { namedExports: false })).toBe(undefined);
  });
  test('returns "invalid-js-identifier" for invalid JS identifier when namedExports is true', () => {
    expect(validateTokenName('a-1', { namedExports: true })).toBe('invalid-js-identifier');
  });
  test('returns undefined for invalid JS identifier when namedExports is false', () => {
    expect(validateTokenName('a-1', { namedExports: false })).toBe(undefined);
  });
  test('returns "backslash-not-allowed" for backslash when namedExports is false', () => {
    expect(validateTokenName('a\\b', { namedExports: false })).toBe('backslash-not-allowed');
  });
  test('returns "invalid-js-identifier" for backslash when namedExports is true', () => {
    expect(validateTokenName('a\\b', { namedExports: true })).toBe('invalid-js-identifier');
  });
});

test('findUsedTokenNames', () => {
  const text = dedent`
    import styles from './a.module.css';
    styles.a_1;
    styles.a_1;
    styles.a_2;
    styles['a_3'];
    styles["a_4"];
    styles[\`a_5\`];
    // styles.a_6; // false positive, but it is acceptable for simplicity of implementation
    styles['a_7;
    styles['a_8"];
    styles;
  `;
  const expected = new Set(['a_1', 'a_2', 'a_6']);
  expect(findUsedTokenNames(text)).toEqual(expected);
});
