import { writeFile } from 'node:fs/promises';
import dedent from 'dedent';
import { expect, test } from 'vitest';
import { createIFF } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

test('adding file', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {},
        "cmkOptions": {}
      }
    `,
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['index.ts'] }],
  });

  // If a.module.css does not exist, a diagnostic should be reported in index.ts
  const res1 = await tsserver.sendSemanticDiagnosticsSync({
    file: iff.paths['index.ts'],
  });
  expect(res1.body).toMatchInlineSnapshot(`
    [
      {
        "category": "error",
        "code": 2307,
        "end": {
          "line": 1,
          "offset": 36,
        },
        "start": {
          "line": 1,
          "offset": 20,
        },
        "text": "Cannot find module './a.module.css' or its corresponding type declarations.",
      },
    ]
  `);

  // Add a.module.css
  await writeFile(iff.join('a.module.css'), '.a_1 { color: red; }');
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.join('a.module.css') }],
  });

  // If a.module.css exists, the diagnostic should disappear
  const res2 = await tsserver.sendSemanticDiagnosticsSync({
    file: iff.paths['index.ts'],
  });
  // TODO: It should be `[]`.
  expect(res2.body).toMatchInlineSnapshot(`
    [
      {
        "category": "error",
        "code": 2307,
        "end": {
          "line": 1,
          "offset": 36,
        },
        "start": {
          "line": 1,
          "offset": 20,
        },
        "text": "Cannot find module './a.module.css' or its corresponding type declarations.",
      },
    ]
  `);
});

test('updating file', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': '',
    'tsconfig.json': dedent`
      {
        "compilerOptions": {},
        "cmkOptions": {}
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
          "line": 2,
          "offset": 11,
        },
        "start": {
          "line": 2,
          "offset": 8,
        },
        "text": "Property 'a_1' does not exist on type '{}'.",
      },
    ]
  `);

  // Update a.module.css to have a semantic error
  await tsserver.sendUpdateOpen({
    changedFiles: [
      {
        fileName: iff.paths['a.module.css'],
        textChanges: [
          {
            start: { line: 1, offset: 1 },
            end: { line: 1, offset: 1 },
            newText: dedent`
              .a_1 {}
              .a-2 {}
            `,
          },
        ],
      },
    ],
  });

  // The diagnostics in a.module.css are updated
  const res2 = await tsserver.sendSemanticDiagnosticsSync({
    file: iff.paths['a.module.css'],
  });
  expect(res2.body).toMatchInlineSnapshot(`[]`);

  // The diagnostics of files importing a.module.css are updated.
  const res3 = await tsserver.sendSemanticDiagnosticsSync({
    file: iff.paths['index.ts'],
  });
  expect(res3.body).toMatchInlineSnapshot(`[]`);
});

test.todo('removing file');
