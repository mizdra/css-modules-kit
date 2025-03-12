import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  createMatchesPattern,
  findComponentFile,
  findComponentFileSync,
  getCssModuleFileName,
  getFileNamesByPattern,
  isComponentFileName,
  isCSSModuleFile,
} from './file.js';
import { createIFF } from './test/fixture.js';

const readFile = async (path: string) => fs.promises.readFile(path, 'utf-8');
const readFileSync = (path: string) => fs.readFileSync(path, 'utf-8');

describe('isCSSModuleFile', () => {
  test.each([
    ['a.module.css', true],
    ['a.module.scss', false],
    ['a.css', false],
  ])('%s', (input, expected) => {
    expect(isCSSModuleFile(input)).toBe(expected);
  });
});

test('getCssModuleFileName', () => {
  expect(getCssModuleFileName('/path/to/file.tsx')).toBe('/path/to/file.module.css');
  expect(getCssModuleFileName('/path/to/file.ts')).toBe('/path/to/file.module.css');
});

describe('isComponentFileName', () => {
  test.each([
    ['Button.tsx', true],
    ['Button.jsx', true],
    ['math.ts', false],
    ['page.tsx', true],
  ])('%s', (input, expected) => {
    expect(isComponentFileName(input)).toBe(expected);
  });
});

test('findComponentFile', async () => {
  const iff = await createIFF({
    'a.jsx': `'a.jsx'`,
    'b.tsx': `'b.tsx'`,
    'c.jsx': `'c.jsx'`,
    'c.tsx': `'c.tsx'`,
  });
  expect(await findComponentFile(iff.join('a.module.css'), readFile)).toStrictEqual({
    fileName: iff.paths['a.jsx'],
    text: `'a.jsx'`,
  });
  expect(await findComponentFile(iff.join('b.module.css'), readFile)).toStrictEqual({
    fileName: iff.paths['b.tsx'],
    text: `'b.tsx'`,
  });
  expect(await findComponentFile(iff.join('c.module.css'), readFile)).toStrictEqual({
    fileName: iff.paths['c.tsx'],
    text: `'c.tsx'`,
  });
  expect(await findComponentFile(iff.join('d.module.css'), readFile)).toBe(undefined);
});

test('findComponentFileSync', async () => {
  const iff = await createIFF({
    'a.jsx': `'a.jsx'`,
    'b.tsx': `'b.tsx'`,
    'c.jsx': `'c.jsx'`,
    'c.tsx': `'c.tsx'`,
  });
  expect(findComponentFileSync(iff.join('a.module.css'), readFileSync)).toStrictEqual({
    fileName: iff.paths['a.jsx'],
    text: `'a.jsx'`,
  });
  expect(findComponentFileSync(iff.join('b.module.css'), readFileSync)).toStrictEqual({
    fileName: iff.paths['b.tsx'],
    text: `'b.tsx'`,
  });
  expect(findComponentFileSync(iff.join('c.module.css'), readFileSync)).toStrictEqual({
    fileName: iff.paths['c.tsx'],
    text: `'c.tsx'`,
  });
  expect(findComponentFileSync(iff.join('d.module.css'), readFileSync)).toBe(undefined);
});

describe('createMatchesPattern', () => {
  describe('matches files matched by `include`', () => {
    const matchesPattern = createMatchesPattern({
      includes: ['/app/src'],
      excludes: [],
    });
    test.each([
      ['/app/src/a.module.css', true],
      ['/app/src/sub/a.module.css', true],
      ['/app/a.module.css', false],
      ['/app/src.module.css', false],
    ])('matchesPattern(%s) should be %s', (input, expected) => {
      expect(matchesPattern(input)).toBe(expected);
    });
  });
  describe('does not match files that does not end with `.module.css`', () => {
    const matchesPattern = createMatchesPattern({
      includes: ['/app/src'],
      excludes: [],
    });
    test.each([
      ['/app/src/a.module.css', true],
      ['/app/src/a.css', false],
      ['/app/src/a.ts', false],
    ])('matchesPattern(%s) should be %s', (input, expected) => {
      expect(matchesPattern(input)).toBe(expected);
    });
  });
  describe('matches all .module.css files when `include` is empty', () => {
    const matchesPattern = createMatchesPattern({
      includes: [],
      excludes: [],
    });
    test.each([
      ['/app/src/a.module.css', true],
      ['/app/a.module.css', true],
    ])('matchesPattern(%s) should be %s', (input, expected) => {
      expect(matchesPattern(input)).toBe(expected);
    });
  });
  describe('does not match files matched by `excludes`', () => {
    const matchesPattern = createMatchesPattern({
      includes: ['/app/src'],
      excludes: ['/app/src/exclude'],
    });
    test.each([
      ['/app/src/a.module.css', true],
      ['/app/src/exclude/a.module.css', false],
      ['/app/src/exclude/sub/a.module.css', false],
      ['/app/src/exclude.module.css', true],
    ])('matchesPattern(%s) should be %s', (input, expected) => {
      expect(matchesPattern(input)).toBe(expected);
    });
  });
  describe('does not match files in node_modules/bower_components/jspm_packages', () => {
    // ref: https://github.com/microsoft/TypeScript/blob/caf1aee269d1660b4d2a8b555c2d602c97cb28d7/src/compiler/utilities.ts#L9506
    const matchesPattern = createMatchesPattern({
      includes: ['/app'],
      excludes: [],
    });
    test.each([
      ['/app/node_modules/package/a.module.css', false],
      ['/app/bower_components/package/a.module.css', false],
      ['/app/jspm_packages/package/a.module.css', false],
    ])('matchesPattern(%s) should be %s', (input, expected) => {
      expect(matchesPattern(input)).toBe(expected);
    });
  });
  describe('supports glob patterns', () => {
    const matchesPattern = createMatchesPattern({
      includes: ['/app/src1/**/*', '/app/src2/*'],
      excludes: ['/app/src1/exclude1/**/*', '/app/src1/**/exclude2'],
    });
    test.each([
      ['/app/src1/a.module.css', true],
      ['/app/src1/sub/a.module.css', true],
      ['/app/a.module.css', false],
      ['/app/src1/exclude1/a.module.css', false],
      ['/app/src1/exclude1/sub/a.module.css', false],
      ['/app/src1/exclude2/a.module.css', false],
      ['/app/src1/exclude2.module.css', true],
      ['/app/src2/a.module.css', true],
      ['/app/src2/sub/a.module.css', false],
    ])('matchesPattern(%s) should be %s', (input, expected) => {
      expect(matchesPattern(input)).toBe(expected);
    });
  });
});

describe('getFileNamesByPattern', () => {
  test('matches files matched by `includes`', async () => {
    const iff = await createIFF({
      'a.module.css': '',
      'src/a.module.css': '',
      'src/sub/a.module.css': '',
    });
    const result = getFileNamesByPattern({
      includes: [iff.join('src')],
      excludes: [],
      basePath: iff.rootDir,
    });
    expect(result.sort()).toEqual([iff.paths['src/a.module.css'], iff.paths['src/sub/a.module.css']].sort());
  });
  test('does not match files that does not end with `.module.css`', async () => {
    const iff = await createIFF({
      'src/a.module.css': '',
      'src/a.css': '',
      'src/a.ts': '',
    });
    const result = getFileNamesByPattern({
      includes: [iff.join('src')],
      excludes: [],
      basePath: iff.rootDir,
    });
    expect(result).toEqual([iff.paths['src/a.module.css']]);
  });
  test('matches all .module.css files when `includes` is empty', async () => {
    const iff = await createIFF({
      'src/a.module.css': '',
      'a.module.css': '',
    });
    const result = getFileNamesByPattern({
      includes: [],
      excludes: [],
      basePath: iff.rootDir,
    });
    expect(result.sort()).toEqual([iff.paths['src/a.module.css'], iff.paths['a.module.css']].sort());
  });
  test('does not match files matched by `excludes`', async () => {
    const iff = await createIFF({
      'src/a.module.css': '',
      'src/exclude/a.module.css': '',
    });
    const result = getFileNamesByPattern({
      includes: [iff.join('src')],
      excludes: [iff.join('src/exclude')],
      basePath: iff.rootDir,
    });
    expect(result).toEqual([iff.paths['src/a.module.css']]);
  });
  test('does not match files in node_modules/bower_components/jspm_packages', async () => {
    const iff = await createIFF({
      'node_modules/package/a.module.css': '',
      'bower_components/package/a.module.css': '',
      'jspm_packages/package/a.module.css': '',
    });
    const result = getFileNamesByPattern({
      includes: [iff.rootDir],
      excludes: [],
      basePath: iff.rootDir,
    });
    expect(result).toEqual([]);
  });
  test('supports glob patterns', async () => {
    const iff = await createIFF({
      'src1/a.module.css': '',
      'src1/sub/a.module.css': '',
      'src1/exclude1/a.module.css': '',
      'src1/exclude1/sub/a.module.css': '',
      'src1/exclude2/a.module.css': '',
      'src1/exclude2.module.css': '',
      'src2/a.module.css': '',
      'src2/sub/a.module.css': '',
    });
    const result = getFileNamesByPattern({
      includes: [iff.join('src1/**/*'), iff.join('src2/*')],
      excludes: [iff.join('src1/exclude1/**/*'), iff.join('src1/**/exclude2')],
      basePath: iff.rootDir,
    });
    expect(result.sort()).toEqual(
      [
        iff.paths['src1/a.module.css'],
        iff.paths['src1/sub/a.module.css'],
        iff.paths['src1/exclude2.module.css'],
        iff.paths['src2/a.module.css'],
      ].sort(),
    );
  });
});
