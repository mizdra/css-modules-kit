import dedent from 'dedent';
import { expect, test } from 'vite-plus/test';
import { createIFF } from './test-util/fixture.js';
import { launchTsserver, normalizeDefinitions } from './test-util/tsserver.js';

test('does not provide language features when cmkOptions.enabled is false', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': dedent`
      .a_1 { color: red; }
    `,
    'tsconfig.json': dedent`
      { "cmkOptions": { "enabled": false } }
    `,
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['index.ts'] }],
  });
  const res = await tsserver.sendDefinitionAndBoundSpan({
    file: iff.paths['index.ts'],
    line: 2,
    offset: 8,
  });
  expect(normalizeDefinitions(res.body?.definitions ?? [])).toStrictEqual([]);
});
