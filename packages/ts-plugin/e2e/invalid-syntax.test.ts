import dedent from 'dedent';
import { describe, expect, test } from 'vitest';
import { createIFF } from './test/fixture.js';
import { formatPath, launchTsserver, simplifyDefinitions, sortDefinitions } from './test/tsserver.js';

describe('handle invalid syntax CSS without crashing', async () => {
  const tsserver = launchTsserver();
  const iff = await createIFF({
    'index.ts': dedent`
      import styles from './a.module.css';
      styles.a_1;
    `,
    'a.module.css': dedent`
      .a_1 { color: red; }
      .a_2 {
    `,
    'tsconfig.json': dedent`
      {
        "compilerOptions": {
          "plugins": [{ "name": "@css-modules-kit/ts-plugin", "languages": ["css"] }],
        },
        "cmkOptions": {
          "dtsOutDir": "generated"
        }
      }
    `,
  });
  await tsserver.sendUpdateOpen({
    openFiles: [{ file: iff.paths['index.ts'] }],
  });
  test('can get definition and bound span', async () => {
    const res = await tsserver.sendDefinitionAndBoundSpan({
      file: iff.paths['index.ts'],
      line: 2,
      offset: 8,
    });
    const expected = [
      {
        file: formatPath(iff.paths['a.module.css']),
        start: { line: 1, offset: 2 },
        end: { line: 1, offset: 5 },
      },
    ];
    expect(sortDefinitions(simplifyDefinitions(res.body?.definitions ?? []))).toStrictEqual(sortDefinitions(expected));
  });
  test('does not report syntactic diagnostics', async () => {
    // NOTE: The standard CSS Language Server reports invalid syntax errors.
    // Therefore, if ts-plugin also reports it, the same error is reported twice.
    // To avoid this, ts-plugin does not report invalid syntax errors.
    const res = await tsserver.sendSyntacticDiagnosticsSync({
      file: iff.paths['a.module.css'],
    });
    expect(res.body).toMatchInlineSnapshot(`[]`);
  });
});
