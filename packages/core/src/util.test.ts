import dedent from 'dedent';
import { describe, expect, test } from 'vite-plus/test';
import { parseCSSModule } from './parser/css-module-parser.js';
import { findUsedTokenNames, validateTokenName } from './util.js';

function parse(css: string) {
  return parseCSSModule(css, { fileName: '/test.module.css', includeSyntaxError: false, keyframes: true });
}

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
  test('returns "backslash-not-allowed" for backslash', () => {
    expect(validateTokenName('a\\b', { namedExports: false })).toBe('backslash-not-allowed');
    expect(validateTokenName('a\\b', { namedExports: true })).toBe('backslash-not-allowed');
  });
});

describe('findUsedTokenNames', () => {
  test('collects token names referenced from the component file', () => {
    const text = dedent`
      import styles from './a.module.css';
      styles.a_1;
      styles.a_1;
      styles.a_2;
      styles['a-3'];
      styles["a-4"];
      styles[\`a-5\`];
      // styles.a_6; // false positive, but it is acceptable for simplicity of implementation
      styles['a-7;
      styles['a-8"];
      styles;
    `;
    const expected = new Set(['a_1', 'a_2', 'a-3', 'a-4', 'a_6']);
    expect(findUsedTokenNames(text, parse(''))).toEqual(expected);
  });
  test('collects token names referenced from animation-name in the CSS module', () => {
    const cssModule = parse('.a_3 { animation-name: a_1, a_2; }');
    expect(findUsedTokenNames('styles.a_3;', cssModule)).toEqual(new Set(['a_1', 'a_2', 'a_3']));
  });
  test('collects token names referenced from composes in the CSS module', () => {
    const cssModule = parse('.a_3 { composes: a_1 a_2; }');
    expect(findUsedTokenNames('styles.a_3;', cssModule)).toEqual(new Set(['a_1', 'a_2', 'a_3']));
  });
  test('does not collect token names referenced from composes with a `from` specifier', () => {
    const cssModule = parse(`.a_2 { composes: a_1 from './b.module.css'; }`);
    expect(findUsedTokenNames('styles.a_2;', cssModule)).toEqual(new Set(['a_2']));
  });
});
