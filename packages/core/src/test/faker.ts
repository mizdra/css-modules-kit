import type { CMKConfig } from '../config.js';
import { dirname, join } from '../path.js';
import type { MatchesPattern, Resolver } from '../type.js';

export function fakeConfig(args?: Partial<CMKConfig>): CMKConfig {
  return {
    includes: [],
    excludes: [],
    dtsOutDir: 'generated',
    arbitraryExtensions: false,
    namedExports: false,
    prioritizeNamedImports: false,
    basePath: '/app',
    configFileName: '/app/tsconfig.json',
    compilerOptions: {},
    diagnostics: [],
    ...args,
  };
}

export function fakeResolver(): Resolver {
  return (specifier, { request }) => join(dirname(request), specifier);
}

export function fakeMatchesPattern(): MatchesPattern {
  return (fileName) => fileName.endsWith('.module.css');
}
