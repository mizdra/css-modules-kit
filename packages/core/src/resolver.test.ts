import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { join } from './path.js';
import { createResolver } from './resolver.js';
import { createIFF } from './test/fixture.js';

type CompilerOptions = {
  moduleResolution?: 'bundler';
  paths?: Record<string, string[]>;
  baseUrl?: string;
};

function normalizeCompilerOptions(compilerOptions: CompilerOptions, rootDir: string): ts.CompilerOptions {
  const config = ts.parseJsonConfigFileContent({ compilerOptions }, ts.sys, rootDir);
  return config.options;
}

describe('createResolver', async () => {
  const iff = await createIFF({
    'request.module.css': '',
    'a.module.css': '',
    'dir/a.module.css': '',
    'paths1/a.module.css': '',
    'paths2/b.module.css': '',
    'paths3/c.module.css': '',
    'package.json': '{ "imports": { "#*": "./*" } }',
  });
  const request = iff.paths['request.module.css'];
  test('resolves relative path', () => {
    const resolve = createResolver(normalizeCompilerOptions({}, iff.rootDir));
    expect(resolve('./a.module.css', { request })).toBe(iff.paths['a.module.css']);
    expect(resolve('./dir/a.module.css', { request })).toBe(iff.paths['dir/a.module.css']);
  });
  describe('resolve with `paths` option', () => {
    test('basic', () => {
      const resolve = createResolver(
        normalizeCompilerOptions(
          {
            paths: {
              '@/*': ['./paths1/*', './paths2/*'],
              '#/*': ['./paths3/*'],
            },
          },
          iff.rootDir,
        ),
      );
      expect(resolve('@/a.module.css', { request })).toBe(iff.paths['paths1/a.module.css']);
      expect(resolve('@/b.module.css', { request })).toBe(iff.paths['paths2/b.module.css']);
      expect(resolve('#/c.module.css', { request })).toBe(iff.paths['paths3/c.module.css']);
      expect(resolve('@/d.module.css', { request })).toBe(undefined);
    });
    test('with `baseUrl` option', () => {
      const resolve = createResolver(
        normalizeCompilerOptions(
          {
            paths: {
              '@/*': ['./*'],
            },
            baseUrl: join(iff.rootDir, 'dir'),
          },
          iff.rootDir,
        ),
      );
      expect(resolve('@/a.module.css', { request })).toBe(iff.paths['dir/a.module.css']);
    });
  });
  test('resolve with `imports` field', () => {
    const resolve = createResolver(
      normalizeCompilerOptions(
        {
          moduleResolution: 'bundler',
        },
        iff.rootDir,
      ),
    );
    expect(resolve('#a.module.css', { request })).toBe(iff.paths['a.module.css']);
    expect(resolve('#dir/a.module.css', { request })).toBe(iff.paths['dir/a.module.css']);
  });
  test('resolve with `baseUrl` option', () => {
    const resolve = createResolver(
      normalizeCompilerOptions(
        {
          baseUrl: join(iff.rootDir, 'dir'),
        },
        iff.rootDir,
      ),
    );
    expect(resolve('a.module.css', { request })).toBe(iff.paths['dir/a.module.css']);
  });
  test('does not resolve invalid path', () => {
    const resolve = createResolver(normalizeCompilerOptions({}, iff.rootDir));
    expect(resolve('http://example.com', { request })).toBe(undefined);
    expect(resolve('package', { request })).toBe(undefined);
    expect(resolve('@scope/package', { request })).toBe(undefined);
    expect(resolve('~package', { request })).toBe(undefined);
  });
});
