import { fileURLToPath, pathToFileURL } from 'node:url';
import type { CompilerOptions } from 'typescript';
import ts from 'typescript';
import { isAbsolute, resolve } from './path.js';
import type { Resolver, ResolverOptions } from './type.js';

export function createResolver(
  compilerOptions: CompilerOptions,
  moduleResolutionCache: ts.ModuleResolutionCache | undefined,
): Resolver {
  return (_specifier: string, options: ResolverOptions) => {
    let specifier = _specifier;

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
      specifier = resolvedModule.resolvedFileName.replace(/\.module\.d\.css\.ts$/u, '.module.css');
    }
    if (isAbsolute(specifier)) {
      return resolve(specifier);
    } else if (isRelativeSpecifier(specifier)) {
      // Convert the specifier to an absolute path
      // NOTE: Node.js resolves relative specifier with standard relative URL resolution semantics. So we will follow that here as well.
      // ref: https://nodejs.org/docs/latest-v23.x/api/esm.html#terminology
      return resolve(fileURLToPath(new URL(specifier, pathToFileURL(options.request)).href));
    } else {
      // Do not support URL or bare specifiers
      // TODO: Logging that the specifier could not resolve.
      return undefined;
    }
  };
}

/**
 * Check if the specifier is a relative specifier.
 * @see https://nodejs.org/docs/latest-v23.x/api/esm.html#terminology
 */
function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith('./') || specifier.startsWith('../');
}
