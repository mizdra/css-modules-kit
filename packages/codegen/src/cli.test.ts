import { resolve } from '@css-modules-kit/core';
import { describe, expect, it } from 'vitest';
import { parseCLIArgs } from './cli.js';
import { createLoggerSpy } from './test/logger.js';
import { mockProcessExit, ProcessExitError } from './test/process.js';

const logger = createLoggerSpy();

mockProcessExit();

const cwd = '/app';

describe('parseCLIArgs', () => {
  it('should return default values when no options are provided', () => {
    const args = parseCLIArgs([], cwd, logger);
    expect(args).toStrictEqual({
      project: resolve(cwd),
    });
  });
  it('should parse --help option', () => {
    expect(() => parseCLIArgs(['--help'], cwd, logger)).toThrow(ProcessExitError);
    expect(logger.logMessage).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });
  it('should parse --version option', () => {
    expect(() => parseCLIArgs(['--version'], cwd, logger)).toThrow(ProcessExitError);
    expect(logger.logMessage).toHaveBeenCalledWith(expect.stringMatching(/^\d+\.\d+\.\d+$/u));
  });
  describe('should parse --project option', () => {
    it.each([
      [['--project', 'tsconfig.json'], resolve(cwd, 'tsconfig.json')],
      [['--project', 'tsconfig.base.json'], resolve(cwd, 'tsconfig.base.json')],
      [['--project', '.'], resolve(cwd)],
      [['--project', 'src'], resolve(cwd, 'src')],
    ])('%s %s', (argv, expected) => {
      const args = parseCLIArgs(argv, cwd, logger);
      expect(args).toStrictEqual({ project: expected });
    });
  });
  it('should parse --pretty option', () => {
    expect(parseCLIArgs([], cwd, logger).pretty).toBe(true);
    expect(parseCLIArgs(['--pretty'], cwd, logger).pretty).toBe(true);
    expect(parseCLIArgs(['--no-pretty'], cwd, logger).pretty).toBe(false);
  });
});
