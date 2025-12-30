import { parseArgs } from 'node:util';
import { resolve } from '@css-modules-kit/core';
import packageJson from '../package.json' with { type: 'json' };
import { ParseCLIArgsError } from './error.js';

const helpText = `
Usage: cmk [options]

Options:
  --help, -h     Show help information
  --version, -v  Show version number
  --project, -p  The path to its configuration file, or to a folder with a 'tsconfig.json'.
  --pretty       Enable color and formatting in output to make errors easier to read.
  --clean        Remove the output directory before generating files.                       [default: false]
  --watch, -w    Watch for changes and regenerate files.                                    [default: false]
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
  clean: boolean;
  watch: boolean;
}

/**
 * Parse command-line arguments.
 * @throws {ParseCLIArgsError} If failed to parse CLI arguments.
 */
export function parseCLIArgs(args: string[], cwd: string): ParsedArgs {
  try {
    const { values } = parseArgs({
      args,
      options: {
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
        project: { type: 'string', short: 'p', default: '.' },
        pretty: { type: 'boolean' },
        clean: { type: 'boolean', default: false },
        watch: { type: 'boolean', short: 'w', default: false },
      },
      allowNegative: true,
    });
    return {
      help: values.help,
      version: values.version,
      project: resolve(cwd, values.project),
      pretty: values.pretty,
      clean: values.clean,
      watch: values.watch,
    };
  } catch (cause) {
    throw new ParseCLIArgsError(cause);
  }
}
