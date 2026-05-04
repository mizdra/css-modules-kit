import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

test('reports `Cannot find module` for an import whose source CSS is missing even when a generated .d.ts exists in rootDirs', async () => {
  const { iff, getRange } = await setupFixture({
    'tsconfig.json': dedent`
      {
        "compilerOptions": {
          "rootDirs": [".", "generated"]
        },
        "cmkOptions": { "enabled": true }
      }
    `,
    'index.ts': `import styles from './a.module.css';`,
    'generated/a.module.css.d.ts': dedent`
      const styles: {};
      export default styles;
    `,
  });
  await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

  const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });

  expect(res.body).toStrictEqual([
    {
      category: 'error',
      code: 2307,
      ...getRange('index.ts', `'./a.module.css'`),
      text: `Cannot find module './a.module.css' or its corresponding type declarations.`,
    },
  ]);
});
