import { stripVTControlCharacters } from 'node:util';
import { type Diagnostic, SystemError } from '@css-modules-kit/core';
import { describe, expect, test, vi } from 'vitest';
import { ReadCSSModuleFileError } from '../error.js';
import { createLogger } from './logger.js';

const stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
const stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

const cwd = '/app';

describe('createLogger', () => {
  test('logDiagnostics', () => {
    const logger = createLogger(cwd, false);
    const diagnostics: Diagnostic[] = [
      { text: 'text1', category: 'error' },
      { text: 'text2', category: 'error' },
      {
        text: 'text3',
        category: 'error',
        file: { fileName: '/app/a.module.css', text: '.foo {}' },
        start: { line: 1, column: 2 },
        length: 3,
      },
    ];
    logger.logDiagnostics(diagnostics);
    expect(stripVTControlCharacters(stderrWriteSpy.mock.lastCall![0] as string)).toMatchInlineSnapshot(`
      "error: text1

      error: text2

      a.module.css(1,2): error: text3

      "
    `);
  });
  test('logSystemError', () => {
    const logger = createLogger(cwd, false);
    logger.logSystemError(new SystemError('CODE', 'message'));
    expect(stripVTControlCharacters(stderrWriteSpy.mock.lastCall![0] as string)).toMatchInlineSnapshot(`
      "error: message

      "
    `);
    logger.logSystemError(
      new ReadCSSModuleFileError('/app/a.module.css', new Error('EACCES: permission denied, open ...')),
    );
    expect(stripVTControlCharacters(stderrWriteSpy.mock.lastCall![0] as string)).toMatchInlineSnapshot(`
      "error: Failed to read CSS Module file /app/a.module.css.: EACCES: permission denied, open ...

      "
    `);
  });
  test('logMessage', () => {
    const logger = createLogger(cwd, false);
    logger.logMessage('message');
    expect(stdoutWriteSpy).toHaveBeenCalledWith('message\n');
  });
});
