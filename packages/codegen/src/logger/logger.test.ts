import { type Diagnostic, SystemError } from '@css-modules-kit/core';
import { describe, expect, test, vi } from 'vitest';
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
    ];
    logger.logDiagnostics(diagnostics);
    expect(stderrWriteSpy).toHaveBeenCalledWith('error: text1\n\nerror: text2\n\n');
  });
  test('logSystemError', () => {
    const logger = createLogger(cwd, false);
    logger.logSystemError(new SystemError('CODE', 'message'));
    expect(stderrWriteSpy).toHaveBeenCalledWith('error CODE: message\n');
  });
  test('logMessage', () => {
    const logger = createLogger(cwd, false);
    logger.logMessage('message');
    expect(stdoutWriteSpy).toHaveBeenCalledWith('message\n');
  });
});
