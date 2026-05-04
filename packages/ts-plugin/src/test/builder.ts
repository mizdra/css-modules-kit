interface TSConfig {
  compilerOptions?: Record<string, unknown>;
  cmkOptions?: Record<string, unknown>;
}

export function buildTSConfigJSON(args?: TSConfig): string {
  return JSON.stringify({
    ...(args?.compilerOptions ? { compilerOptions: args.compilerOptions } : {}),
    cmkOptions: {
      enabled: true,
      ...args?.cmkOptions,
    },
  });
}

interface BuildStylesImportOptions {
  namedExports: boolean;
  quote?: 'single' | 'double';
  name?: string;
}

export function buildStylesImport(specifier: string, options: BuildStylesImportOptions): string {
  const { namedExports, quote = 'single', name = 'styles' } = options;
  const q = quote === 'single' ? "'" : '"';
  return namedExports ? `import * as ${name} from ${q}${specifier}${q};` : `import ${name} from ${q}${specifier}${q};`;
}
