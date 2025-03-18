import { parseArgs } from 'node:util';
import { resolve } from '@css-modules-kit/core';
import packageJson from '../package.json';
import type { Logger } from './logger/logger.js';

const helpText = `
Usage: cmk [options]

Options:
  --help, -h     Show help information
  --version, -v  Show version number
  --project, -p  The path to its configuration file, or to a folder with a 'tsconfig.json'.
  --pretty       Enable color and formatting in TypeScript's output to make compiler errors easier to read. (default: true)
`;

export interface ParsedArgs {
  project: string;
  pretty: boolean;
}

/**
 * Parse command-line arguments.
 * If `--help` or `--version` is passed, print the corresponding information and exit the process.
 */
export function parseCLIArgs(args: string[], cwd: string, logger: Logger): ParsedArgs {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
      project: { type: 'string', short: 'p', default: '.' },
      pretty: { type: 'boolean', default: true },
    },
    allowNegative: true,
  });
  if (values.help) {
    logger.logMessage(helpText);
    // eslint-disable-next-line n/no-process-exit
    process.exit(0);
  } else if (values.version) {
    logger.logMessage(packageJson.version);
    // eslint-disable-next-line n/no-process-exit
    process.exit(0);
  }
  return {
    project: resolve(cwd, values.project),
    pretty: values.pretty,
  };
}
