import { expect, test } from 'vite-plus/test';
import { buildTSConfigJSON } from '../src/test/builder.js';
import { fixtureDir, setupFixture } from './test-util/fixture.js';
import { formatPath, launchLSPClient } from './test-util/lsp-client.js';

const client = launchLSPClient(fixtureDir);

const fileHeadRange = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

// Without the middleware, no refactor creates a CSS module.
test.fails('provides Create CSS Module file for a component file when no paired CSS module exists', async () => {
  const { iff } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON({ compilerOptions: { jsx: 'react-jsx' } }),
    'a.tsx': '',
  });
  await client.openFiles([iff.paths['a.tsx']]);

  const actions = await client.sendCodeActions({ file: iff.paths['a.tsx'], range: fileHeadRange, only: ['refactor'] });

  expect(actions.map(({ title, kind }) => ({ title, kind }))).toStrictEqual([
    { title: 'Create CSS Module file for current file', kind: 'refactor' },
  ]);
});

test('omits Create CSS Module file for a non-component file', async () => {
  const { iff } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON(),
    'a.ts': '',
  });
  await client.openFiles([iff.paths['a.ts']]);

  const actions = await client.sendCodeActions({ file: iff.paths['a.ts'], range: fileHeadRange, only: ['refactor'] });

  expect(actions).toStrictEqual([]);
});

test('omits Create CSS Module file when the paired CSS module already exists', async () => {
  const { iff } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON({ compilerOptions: { jsx: 'react-jsx' } }),
    'a.tsx': '',
    'a.module.css': '',
  });
  await client.openFiles([iff.paths['a.tsx']]);

  const actions = await client.sendCodeActions({ file: iff.paths['a.tsx'], range: fileHeadRange, only: ['refactor'] });

  expect(actions).toStrictEqual([]);
});

// Without the middleware, no refactor creates a CSS module.
test.fails('creates a new empty CSS module file paired with the component file', async () => {
  const { iff } = await setupFixture({
    'tsconfig.json': buildTSConfigJSON({ compilerOptions: { jsx: 'react-jsx' } }),
    'a.tsx': '',
  });
  await client.openFiles([iff.paths['a.tsx']]);

  const actions = await client.sendCodeActions({ file: iff.paths['a.tsx'], range: fileHeadRange, only: ['refactor'] });

  expect(actions.map(({ edits, createdFiles }) => ({ edits, createdFiles }))).toStrictEqual([
    { edits: [], createdFiles: [formatPath(iff.join('a.module.css'))] },
  ]);
});
