import { spawnSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';
import { join } from '@css-modules-kit/core';
import dedent from 'dedent';
import { expect, test } from 'vitest';
import { createIFF } from '../src/test/fixture.js';

const binPath = join(import.meta.dirname, '../bin/cmk.js');
const tscPath = join(import.meta.dirname, '../../../node_modules/typescript/bin/tsc');

test('generates .d.ts', async () => {
  const iff = await createIFF({
    'src/a.module.css': dedent`
      @import './b.module.css';
      @import './external.css';
      /* @import '@/c.module.css'; */ /* TODO: Fix this */
      .a1 { color: red; }
    `,
    'src/b.module.css': `.b1 { color: red; }`,
    'src/c.module.css': `.c1 { color: red; }`,
    'src/a.ts': dedent`
      import styles from './a.module.css';
      (styles.a1 satisfies string);
      (styles.b1 satisfies string);
      // (styles.c1 satisfies string); // TODO: Fix this
      // @ts-expect-error
      styles.a2;
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {
          "lib": ["ES2015"],
          "noEmit": true,
          "paths": { "@/*": ["./src/*"] },
          "rootDirs": [".", "generated"]
        },
        "cmkOptions": { "enabled": true }
      }
    `,
  });
  const cmk = spawnSync('node', [binPath], { cwd: iff.rootDir });
  expect(cmk.error).toBeUndefined();
  expect(cmk.stderr.toString()).toBe('');
  expect(cmk.status).toBe(0);
  expect(await iff.readFile('generated/src/a.module.css.d.ts')).toMatchInlineSnapshot(`
    "// @ts-nocheck
    declare const styles = {
      a1: '' as readonly string,
      ...(await import('./b.module.css')).default,
    };
    export default styles;
    "
  `);
  expect(await iff.readFile('generated/src/b.module.css.d.ts')).toMatchInlineSnapshot(`
    "// @ts-nocheck
    declare const styles = {
      b1: '' as readonly string,
    };
    export default styles;
    "
  `);
  expect(await iff.readFile('generated/src/c.module.css.d.ts')).toMatchInlineSnapshot(`
    "// @ts-nocheck
    declare const styles = {
      c1: '' as readonly string,
    };
    export default styles;
    "
  `);

  // Check if the generated .d.ts passes the type check
  const tsc = spawnSync('node', [tscPath], { cwd: iff.rootDir });
  expect(tsc.error).toBeUndefined();
  expect(tsc.stdout.toString()).toBe('');
  expect(tsc.status).toBe(0);
});

test('prints help text', () => {
  const cmk = spawnSync('node', [binPath, '--help']);
  expect(cmk.error).toBeUndefined();
  expect(cmk.stdout.toString()).contain('Usage');
  expect(cmk.status).toBe(0);
});

test('prints version number', () => {
  const cmk = spawnSync('node', [binPath, '--version']);
  expect(cmk.error).toBeUndefined();
  expect(cmk.stdout.toString()).toMatch(/\d+\.\d+\.\d+/u);
  expect(cmk.status).toBe(0);
});

test('reports CSS syntax error', async () => {
  const iff = await createIFF({
    'src/a.module.css': `badword`,
    'tsconfig.json': '{ "cmkOptions": { "enabled": true } }',
  });
  const cmk = spawnSync('node', [binPath, '--pretty'], { cwd: iff.rootDir });
  expect(cmk.status).toBe(1);
  expect(stripVTControlCharacters(cmk.stderr.toString())).toMatchInlineSnapshot(`
    "src/a.module.css:1:1 - error: Unknown word badword

    1 badword
      ~~~~~~~

    "
  `);
});

test('reports system error', async () => {
  const iff = await createIFF({});
  const cmk = spawnSync('node', [binPath], {
    cwd: iff.rootDir,
  });
  expect(cmk.status).toBe(1);
  expect(cmk.stderr.toString()).toMatchInlineSnapshot(`
    "error: No tsconfig.json found.

    "
  `);
});

test('generates .d.ts with circular import', async () => {
  const iff = await createIFF({
    'src/a.module.css': dedent`
      @import './b.module.css';
      .a1 { color: red; }
    `,
    'src/b.module.css': dedent`
      @import './a.module.css';
      .b1 { color: red; }
    `,
    'src/c.module.css': dedent`
      @import './c.module.css';
      .c1 { color: red; }
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {
          "lib": ["ES2015"],
          "noEmit": true,
          "rootDirs": [".", "generated"]
        },
        "cmkOptions": { "enabled": true }
      }
    `,
  });
  const cmk = spawnSync('node', [binPath], {
    cwd: iff.rootDir,
  });
  expect(cmk.error).toBeUndefined();
  expect(cmk.stderr.toString()).toBe('');
  expect(cmk.status).toBe(0);
  expect(await iff.readFile('generated/src/a.module.css.d.ts')).toMatchInlineSnapshot(`
    "// @ts-nocheck
    declare const styles = {
      a1: '' as readonly string,
      ...(await import('./b.module.css')).default,
    };
    export default styles;
    "
  `);
  expect(await iff.readFile('generated/src/b.module.css.d.ts')).toMatchInlineSnapshot(`
    "// @ts-nocheck
    declare const styles = {
      b1: '' as readonly string,
      ...(await import('./a.module.css')).default,
    };
    export default styles;
    "
  `);
  expect(await iff.readFile('generated/src/c.module.css.d.ts')).toMatchInlineSnapshot(`
    "// @ts-nocheck
    declare const styles = {
      c1: '' as readonly string,
      ...(await import('./c.module.css')).default,
    };
    export default styles;
    "
  `);

  // Check if the generated .d.ts passes the type check
  const tsc = spawnSync('node', [tscPath], { cwd: iff.rootDir });
  expect(tsc.error).toBeUndefined();
  expect(tsc.stdout.toString()).toBe('');
  expect(tsc.status).toBe(0);
});
