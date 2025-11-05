#!/usr/bin/env node
/* eslint-disable n/no-process-exit */

import {
  createLogger,
  parseCLIArgs,
  printHelpText,
  printVersion,
  runCMK,
  runCMKInWatchMode,
  shouldBePretty,
} from '../dist/index.js';

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

  // Normal mode and watch mode behave differently when errors occur.
  // - Normal mode: Outputs errors to the terminal and exits the process with exit code 1.
  // - Watch mode: Outputs errors to the terminal but does not terminate the process. Continues watching the file.
  if (args.watch) {
    const watcher = await runCMKInWatchMode(args, logger);
    process.on('SIGINT', () => watcher.close());
  } else {
    const success = await runCMK(args, logger);
    if (!success) {
      process.exit(1);
    }
  }
} catch (e) {
  logger.logError(e);
  process.exit(1);
}
