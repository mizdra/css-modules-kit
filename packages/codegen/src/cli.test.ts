import { resolve } from '@css-modules-kit/core';
import { describe, expect, it } from 'vitest';
import { parseCLIArgs } from './cli.js';
import { ParseCLIArgsError } from './error.js';

const cwd = '/app';

describe('parseCLIArgs', () => {
  it('should return default values when no options are provided', () => {
    const args = parseCLIArgs([], cwd);
    expect(args).toStrictEqual({
      help: false,
      version: false,
      project: resolve(cwd),
      pretty: undefined,
      clean: false,
      watch: false,
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
  it('should parse --clean option', () => {
    expect(parseCLIArgs(['--clean'], cwd).clean).toBe(true);
    expect(parseCLIArgs(['--no-clean'], cwd).clean).toBe(false);
  });
  it('should parse --watch option', () => {
    expect(parseCLIArgs(['--watch'], cwd).watch).toBe(true);
    expect(parseCLIArgs(['--no-watch'], cwd).watch).toBe(false);
    expect(parseCLIArgs(['-w'], cwd).watch).toBe(true);
  });
  it('should throw ParseCLIArgsError for invalid options', () => {
    expect(() => parseCLIArgs(['--invalid-option'], cwd)).toThrow(ParseCLIArgsError);
  });
});
