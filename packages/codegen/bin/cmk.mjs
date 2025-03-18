#!/usr/bin/env node
/* eslint-disable n/no-process-exit */

import { SystemError } from '@css-modules-kit/core';
import { createLogger, parseCLIArgs, printHelpText, printVersion, runCMK } from '../dist/index.js';

const cwd = process.cwd();
const logger = createLogger(cwd);
const args = parseCLIArgs(process.argv.slice(2), cwd);

if (args.help) {
  printHelpText();
  process.exit(0);
} else if (args.version) {
  printVersion();
  process.exit(0);
}

try {
  await runCMK(args.project, logger);
} catch (e) {
  if (e instanceof SystemError) {
    logger.logSystemError(e);
    process.exit(1);
  }
  throw e;
}
