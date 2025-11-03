import type { ParsedArgs } from '../cli.js';

export function fakeParsedArgs(args?: Partial<ParsedArgs>): ParsedArgs {
  return {
    help: false,
    version: false,
    project: '.',
    pretty: undefined,
    clean: false,
    watch: false,
    ...args,
  };
}
