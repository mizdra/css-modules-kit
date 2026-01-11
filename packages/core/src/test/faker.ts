import type { CMKConfig } from '../config.js';
import { createResolver } from '../resolver.js';
import type { MatchesPattern, Resolver } from '../type.js';

export function fakeConfig(args?: Partial<CMKConfig>): CMKConfig {
  return {
    includes: ['/app/**/*'],
    excludes: [],
    enabled: true,
    dtsOutDir: 'generated',
    arbitraryExtensions: false,
    namedExports: false,
    prioritizeNamedImports: false,
    keyframes: true,
    basePath: '/app',
    configFileName: '/app/tsconfig.json',
    compilerOptions: {},
    wildcardDirectories: [{ fileName: '/app', recursive: true }],
    diagnostics: [],
    ...args,
  };
}

export function fakeResolver(args?: { config?: CMKConfig }): Resolver {
  const config = args?.config ?? fakeConfig();
  return createResolver(config.compilerOptions, undefined);
}

export function fakeMatchesPattern(): MatchesPattern {
  return (fileName) => fileName.endsWith('.module.css');
}
