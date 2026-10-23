import { test } from 'vite-plus/test';

/** Returns `test.fails` when `condition` is true, and `test` otherwise. */
export function testFailsIf(condition: boolean): typeof test | typeof test.fails {
  return condition ? test.fails : test;
}
