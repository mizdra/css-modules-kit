import type { CompilerOptions } from 'typescript';
import ts from 'typescript';
import { resolve } from './path.js';
import type { Resolver, ResolverOptions } from './type.js';

export function createResolver(
  compilerOptions: CompilerOptions,
  moduleResolutionCache: ts.ModuleResolutionCache | undefined,
): Resolver {
  return (specifier: string, options: ResolverOptions) => {
    const host: ts.ModuleResolutionHost = {
      ...ts.sys,
      fileExists: (fileName) => {
        if (fileName.endsWith('.module.d.css.ts')) {
          return ts.sys.fileExists(fileName.replace(/\.module\.d\.css\.ts$/u, '.module.css'));
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
      return resolve(resolvedModule.resolvedFileName.replace(/\.module\.d\.css\.ts$/u, '.module.css'));
    }
    return undefined;
  };
}
