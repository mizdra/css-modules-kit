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

export function buildStylesImport(specifier: string, { namedExports }: { namedExports: boolean }): string {
  return namedExports ? `import * as styles from '${specifier}';` : `import styles from '${specifier}';`;
}
