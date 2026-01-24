import type { CompilerOptions } from 'typescript';
import ts from 'typescript';
import type { Resolver, ResolverOptions } from './type.js';
import { isURLSpecifier } from './util.js';

export function createResolver(
  compilerOptions: CompilerOptions,
  moduleResolutionCache: ts.ModuleResolutionCache | undefined,
): Resolver {
  return (specifier: string, options: ResolverOptions) => {
    if (isURLSpecifier(specifier)) return undefined;
    const host: ts.ModuleResolutionHost = {
      ...ts.sys,
      fileExists: (fileName) => {
        if (fileName.endsWith('.d.css.ts')) {
          return ts.sys.fileExists(fileName.replace(/\.d\.css\.ts$/u, '.css'));
        }
        return ts.sys.fileExists(fileName);
      },
    };
    const { resolvedModule } = ts.resolveModuleName(
      specifier,
      options.request,
      compilerOptions,
      host,
      moduleResolutionCache,
    );
    if (resolvedModule) {
      // TODO: Logging that the paths is used.
      return resolvedModule.resolvedFileName.replace(/\.d\.css\.ts$/u, '.css');
    }
    return undefined;
  };
}
