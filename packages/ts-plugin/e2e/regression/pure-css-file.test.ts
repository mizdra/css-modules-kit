import dedent from 'dedent';
import { expect, test } from 'vitest';
import { createIFF } from '../test/fixture.js';
import { launchTsserver } from '../test/tsserver.js';

test('ts-plugin does not process pure css files', async () => {
  // ref: https://github.com/mizdra/css-modules-kit/issues/170
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'global.css': dedent`
      * { margin: 0; }
    `,
    'tsconfig.json': '{}',
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['tsconfig.json'] }],
  });
  const res1 = await tsserver.sendSyntacticDiagnosticsSync({
    file: iff.paths['global.css'],
  });
  expect(res1.body?.length).toBe(0);
  const res2 = await tsserver.sendSemanticDiagnosticsSync({
    file: iff.paths['global.css'],
  });
  expect(res2.body?.length).toBe(0);
});
