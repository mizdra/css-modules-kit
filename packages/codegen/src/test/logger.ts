import { vi } from 'vite-plus/test';
import type { Logger } from '../logger/logger.js';

export function createLoggerSpy() {
  return {
    logDiagnostics: vi.fn(),
    logError: vi.fn(),
    logMessage: vi.fn(),
    clearScreen: vi.fn(),
  } satisfies Logger;
}
