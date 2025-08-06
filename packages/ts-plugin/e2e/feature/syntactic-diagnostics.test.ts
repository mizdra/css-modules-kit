import dedent from 'dedent';
import { expect, test } from 'vitest';
import { createIFF } from '../test-util/fixture.js';
import { launchTsserver } from '../test-util/tsserver.js';

test('Syntactic Diagnostics', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'a.module.css': dedent`
      @value;
      :local(:global(.a_1)) { color: red; }
      :local .a_2 { color: red; }
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
    openFiles: [{ file: iff.paths['a.module.css'] }],
  });
  const res1 = await tsserver.sendSyntacticDiagnosticsSync({
    file: iff.paths['a.module.css'],
  });
  expect(res1.body).toMatchInlineSnapshot(`
    [
      {
        "category": "error",
        "code": 0,
        "end": {
          "line": 1,
          "offset": 8,
        },
        "source": "css-modules-kit",
        "start": {
          "line": 1,
          "offset": 1,
        },
        "text": "\`@value\` is a invalid syntax.",
      },
      {
        "category": "error",
        "code": 0,
        "end": {
          "line": 2,
          "offset": 21,
        },
        "source": "css-modules-kit",
        "start": {
          "line": 2,
          "offset": 8,
        },
        "text": "A \`:global(...)\` is not allowed inside of \`:local(...)\`.",
      },
      {
        "category": "error",
        "code": 0,
        "end": {
          "line": 3,
          "offset": 7,
        },
        "source": "css-modules-kit",
        "start": {
          "line": 3,
          "offset": 1,
        },
        "text": "css-modules-kit does not support \`:local\`. Use \`:local(...)\` instead.",
      },
    ]
  `);
});
