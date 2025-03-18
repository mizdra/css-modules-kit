import { resolve } from '@css-modules-kit/core';
import { describe, expect, it } from 'vitest';
import { parseCLIArgs } from './cli.js';

const cwd = '/app';

describe('parseCLIArgs', () => {
  it('should return default values when no options are provided', () => {
    const args = parseCLIArgs([], cwd);
    expect(args).toStrictEqual({
      help: false,
      version: false,
      project: resolve(cwd),
      pretty: true,
    });
  });
  it('should parse --help option', () => {
    expect(parseCLIArgs(['--help'], cwd).help).toBe(true);
  });
  it('should parse --version option', () => {
    expect(parseCLIArgs(['--version'], cwd).version).toBe(true);
  });
  describe('should parse --project option', () => {
    it.each([
      [['--project', 'tsconfig.json'], resolve(cwd, 'tsconfig.json')],
      [['--project', 'tsconfig.base.json'], resolve(cwd, 'tsconfig.base.json')],
      [['--project', '.'], resolve(cwd)],
      [['--project', 'src'], resolve(cwd, 'src')],
    ])('%s %s', (argv, expected) => {
      const args = parseCLIArgs(argv, cwd);
      expect(args.project).toStrictEqual(expected);
    });
  });
  it('should parse --pretty option', () => {
    expect(parseCLIArgs(['--pretty'], cwd).pretty).toBe(true);
    expect(parseCLIArgs(['--no-pretty'], cwd).pretty).toBe(false);
  });
  // TODO: Add tests for invalid options
});
