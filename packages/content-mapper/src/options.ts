export interface NormalizedMapperOptions {
  namedExports: boolean;
  prioritizeNamedImports: boolean;
  animation: boolean;
  dashedIdents: boolean;
  container: boolean;
}

export interface NormalizeMapperOptionsResult {
  options: NormalizedMapperOptions;
  errors: string[];
}

const DEFAULT_OPTIONS: NormalizedMapperOptions = {
  namedExports: false,
  prioritizeNamedImports: false,
  animation: true,
  dashedIdents: false,
  container: false,
};

const OPTION_KEYS = Object.keys(DEFAULT_OPTIONS) as (keyof NormalizedMapperOptions)[];

/**
 * Normalizes the raw `options` value of a transform request. Invalid values fall back to
 * the defaults, and a human-readable error is collected for each of them.
 */
export function normalizeMapperOptions(raw: unknown): NormalizeMapperOptionsResult {
  const options = { ...DEFAULT_OPTIONS };
  const errors: string[] = [];
  if (raw === undefined) return { options, errors };
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    errors.push('Options must be an object.');
    return { options, errors };
  }
  for (const key of OPTION_KEYS) {
    if (!(key in raw)) continue;
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'boolean') {
      options[key] = value;
    } else {
      errors.push(`\`${key}\` must be a boolean.`);
    }
  }
  return { options, errors };
}
