import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { setupFixture } from './test-util/fixture.js';
import { launchTsserver } from './test-util/tsserver.js';

const tsserver = launchTsserver();

test('excludes generated .d.ts files from module resolution even when listed in rootDirs', async () => {
  const { iff, getFileSpan } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON({ compilerOptions: { rootDirs: ['.', 'generated'] } }),
    'index.ts': `import styles from './a.module.css';`,
    'generated/a.module.css.d.ts': dedent`
      const styles: {};
      export default styles;
    `,
  });
  await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['index.ts'] }] });

  const res = await tsserver.sendSemanticDiagnosticsSync({ file: iff.paths['index.ts'] });

  const { start, end } = getFileSpan('index.ts', `'./a.module.css'`);
  expect(res.body).toStrictEqual([
    {
      category: 'error',
      code: 2307,
      start,
      end,
      text: `Cannot find module './a.module.css' or its corresponding type declarations.`,
    },
  ]);
});
