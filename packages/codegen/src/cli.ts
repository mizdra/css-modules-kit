import { parseArgs } from 'node:util';
import { resolve } from '@css-modules-kit/core';
import packageJson from '../package.json';

const helpText = `
Usage: cmk [options]

Options:
  --help, -h     Show help information
  --version, -v  Show version number
  --project, -p  The path to its configuration file, or to a folder with a 'tsconfig.json'.
  --pretty       Enable color and formatting in output to make errors easier to read.
`;

export function printHelpText(): void {
  // eslint-disable-next-line no-console
  console.log(helpText);
}

export function printVersion(): void {
  // eslint-disable-next-line no-console
  console.log(packageJson.version);
}

export interface ParsedArgs {
  help: boolean;
  version: boolean;
  project: string;
  pretty: boolean | undefined;
}

/**
 * Parse command-line arguments.
 */
export function parseCLIArgs(args: string[], cwd: string): ParsedArgs {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
      project: { type: 'string', short: 'p', default: '.' },
      pretty: { type: 'boolean' },
    },
    allowNegative: true,
  });
  return {
    help: values.help,
    version: values.version,
    project: resolve(cwd, values.project),
    pretty: values.pretty,
  };
}
