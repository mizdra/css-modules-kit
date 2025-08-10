import dedent from 'dedent';
import { expect, test } from 'vitest';
import { createIFF } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

test('report the import of files where .d.ts exists but .module.css does not exist', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    // `a.module.css` is not exist, and the .d.ts file is exist.
    // But `'./a.module.css'` should report an error.
    'index.ts': dedent`
      import styles from './a.module.css';
    `,
    'generated/a.module.css.d.ts': dedent`
      const styles: {};
      export default styles;
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {
          "rootDirs": [".", "generated"],
        }
      }
    `,
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['index.ts'] }],
  });
  const res = await tsserver.sendSemanticDiagnosticsSync({
    file: iff.paths['index.ts'],
  });
  expect(res.body).toMatchInlineSnapshot(`
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
