#!/usr/bin/env node
/* eslint-disable n/no-process-exit */

import { createLogger, parseCLIArgs, printHelpText, printVersion, runCMK, shouldBePretty } from '../dist/index.js';

const cwd = process.cwd();
let logger = createLogger(cwd, shouldBePretty(undefined));

try {
  const args = parseCLIArgs(process.argv.slice(2), cwd);
  logger = createLogger(cwd, shouldBePretty(args.pretty));

  if (args.help) {
    printHelpText();
    process.exit(0);
  } else if (args.version) {
    printVersion();
    process.exit(0);
  }

  const success = await runCMK(args, logger);
  if (!success) {
    process.exit(1);
  }
} catch (e) {
  logger.logError(e);
  process.exit(1);
}
