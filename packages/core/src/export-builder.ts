import type { CSSModule, MatchesPattern, Resolver } from './type.js';

export interface ExportBuilderHost {
  matchesPattern: MatchesPattern;
  getCSSModule: (path: string) => CSSModule | undefined;
  resolver: Resolver;
}

/**
 * The export token record of a CSS module.
 */
export interface ExportRecord {
  /** The all exported tokens of the CSS module. */
  allTokens: string[];
}

export interface ExportBuilder {
  build(cssModule: CSSModule): ExportRecord;
  clearCache(): void;
}

/**
 * A builder for exported token records of CSS modules.
 */
// TODO: Handle same token name from different modules
export function createExportBuilder(host: ExportBuilderHost): ExportBuilder {
  const cache = new Map<string, ExportRecord>();

  function build(cssModule: CSSModule): ExportRecord {
    const cached = cache.get(cssModule.fileName);
    if (cached) return cached;

    // Set an empty record to prevent infinite loop
    // when the module graph has circular dependencies.
    cache.set(cssModule.fileName, { allTokens: [] });

    const result: ExportRecord = { allTokens: [...cssModule.localTokens.map((t) => t.name)] };

    for (const tokenImporter of cssModule.tokenImporters) {
      const from = host.resolver(tokenImporter.from, { request: cssModule.fileName });
      if (!from || !host.matchesPattern(from)) continue;
      const imported = host.getCSSModule(from);
      if (!imported) continue;

      const importedResult = build(imported);
      if (tokenImporter.type === 'import') {
        result.allTokens.push(...importedResult.allTokens);
      } else {
        for (const value of tokenImporter.values) {
          result.allTokens.push(value.name);
        }
      }
    }
    cache.set(cssModule.fileName, result);
    return result;
  }
  function clearCache() {
    cache.clear();
  }
  return { build, clearCache };
}
