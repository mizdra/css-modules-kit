import dedent from 'dedent';
import { expect, test } from 'vitest';
import { createIFF } from '../test-util/fixture.js';
import { launchTsserver } from '../test-util/tsserver.js';

test('Semantic Diagnostics', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      import styles from './a.module.css';
      type Expected = { a_1: string, a_2: string, b_1: string, c_1: string, c_alias: string, c_3: string };
      const t1: Expected = styles;
      const t2: typeof styles = t1;
      styles.unknown;
    `,
    'a.module.css': dedent`
      @import './b.module.css';
      @value c_1, c_2 as c_alias, c_3 from './c.module.css';
      .a_1 { color: red; }
      @value a_2: red;
      .a-3 { color: red; }
    `,
    'b.module.css': dedent`
      .b_1 { color: red; }
    `,
    'c.module.css': dedent`
      @value c_1: red;
      @value c_2: red;
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {},
        "cmkOptions": {
          "dtsOutDir": "generated"
        }
      }
    `,
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['index.ts'] }],
  });
  const res1 = await tsserver.sendSemanticDiagnosticsSync({
    file: iff.paths['index.ts'],
  });
  expect(res1.body).toMatchInlineSnapshot(`
    [
      {
        "category": "error",
        "code": 2339,
        "end": {
          "line": 5,
          "offset": 15,
        },
        "start": {
          "line": 5,
          "offset": 8,
        },
        "text": "Property 'unknown' does not exist on type '{ c_1: string; c_alias: string; c_3: any; b_1: string; a_1: string; a_2: string; }'.",
      },
    ]
  `);

  const res2 = await tsserver.sendSemanticDiagnosticsSync({
    file: iff.paths['a.module.css'],
  });
  expect(res2.body).toMatchInlineSnapshot(`
    [
      {
        "category": "error",
        "code": 0,
        "end": {
          "line": 5,
          "offset": 5,
        },
        "source": "css-modules-kit",
        "start": {
          "line": 5,
          "offset": 2,
        },
        "text": "css-modules-kit does not support invalid names as JavaScript identifiers.",
      },
      {
        "category": "error",
        "code": 0,
        "end": {
          "line": 2,
          "offset": 32,
        },
        "source": "css-modules-kit",
        "start": {
          "line": 2,
          "offset": 29,
        },
        "text": "Module './c.module.css' has no exported token 'c_3'.",
      },
    ]
  `);
});
