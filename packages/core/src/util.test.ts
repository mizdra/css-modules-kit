import dedent from 'dedent';
import { expect, test } from 'vitest';
import { findUsedTokenNames } from './util.js';

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
