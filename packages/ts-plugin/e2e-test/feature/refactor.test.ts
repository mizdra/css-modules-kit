import { describe, expect, test } from 'vite-plus/test';
import { createCssModuleFileRefactor } from '../../src/language-service/feature/refactor.js';
import { buildTSConfigJSON } from '../../src/test/builder.js';
import { setupFixture } from '../test-util/fixture.js';
import { launchTsserver } from '../test-util/tsserver.js';

const tsserver = launchTsserver();

describe('Get Applicable Refactors', () => {
  test('offers Create CSS Module file for a component file when no paired CSS module exists', async () => {
    const { iff } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ compilerOptions: { jsx: 'react-jsx' } }),
      'a.tsx': '',
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.tsx'] }] });

    const res = await tsserver.sendGetApplicableRefactors({
      file: iff.paths['a.tsx'],
      line: 1,
      offset: 1,
    });

    expect(res.body).toStrictEqual([createCssModuleFileRefactor]);
  });

  test('omits Create CSS Module file for a non-component file', async () => {
    const { iff } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON(),
      'a.ts': '',
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.ts'] }] });

    const res = await tsserver.sendGetApplicableRefactors({
      file: iff.paths['a.ts'],
      line: 1,
      offset: 1,
    });

    expect(res.body).toStrictEqual([]);
  });

  test('omits Create CSS Module file when the paired CSS module already exists', async () => {
    const { iff } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ compilerOptions: { jsx: 'react-jsx' } }),
      'a.tsx': '',
      'a.module.css': '',
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.tsx'] }] });

    const res = await tsserver.sendGetApplicableRefactors({
      file: iff.paths['a.tsx'],
      line: 1,
      offset: 1,
    });

    expect(res.body).toStrictEqual([]);
  });
});

describe('Get Edits For Refactor', () => {
  test('emits an edit that creates a new empty CSS module file paired with the component file', async () => {
    const { iff } = await setupFixture({
      'tsconfig.json': buildTSConfigJSON({ compilerOptions: { jsx: 'react-jsx' } }),
      'a.tsx': '',
    });
    await tsserver.sendUpdateOpen({ openFiles: [{ file: iff.paths['a.tsx'] }] });

    const res = await tsserver.sendGetEditsForRefactor({
      refactor: createCssModuleFileRefactor.name,
      action: createCssModuleFileRefactor.actions[0].name,
      file: iff.paths['a.tsx'],
      line: 1,
      offset: 1,
    });

    expect(res.body?.edits).toStrictEqual([
      {
        fileName: iff.join('a.module.css'),
        textChanges: [{ start: { line: 0, offset: 0 }, end: { line: 0, offset: 0 }, newText: '' }],
      },
    ]);
  });
});
