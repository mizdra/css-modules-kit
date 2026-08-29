import type { OptionDiagnostic } from './protocol.js';

export interface NormalizedMapperOptions {
  namedExports: boolean;
  prioritizeNamedImports: boolean;
  animation: boolean;
  dashedIdents: boolean;
  container: boolean;
}

export interface NormalizeMapperOptionsResult {
  options: NormalizedMapperOptions;
  optionDiagnostics: OptionDiagnostic[];
}

const DEFAULT_OPTIONS: NormalizedMapperOptions = {
  namedExports: false,
  prioritizeNamedImports: false,
  animation: true,
  dashedIdents: false,
  container: false,
};

const OPTION_KEYS = Object.keys(DEFAULT_OPTIONS) as (keyof NormalizedMapperOptions)[];

const NOT_AN_OBJECT_CODE = 1001;
const NOT_A_BOOLEAN_CODE = 1002;

/**
 * Normalizes the raw `options` value of an openProject request. Invalid values fall back to
 * the defaults, and an option diagnostic is collected for each of them.
 */
export function normalizeMapperOptions(raw: unknown): NormalizeMapperOptionsResult {
  const options = { ...DEFAULT_OPTIONS };
  const optionDiagnostics: OptionDiagnostic[] = [];
  if (raw === undefined) return { options, optionDiagnostics };
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    optionDiagnostics.push({ path: [], messageText: 'Options must be an object.', code: NOT_AN_OBJECT_CODE });
    return { options, optionDiagnostics };
  }
  for (const key of OPTION_KEYS) {
    if (!(key in raw)) continue;
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'boolean') {
      options[key] = value;
    } else {
      optionDiagnostics.push({
        path: [key],
        messageText: `\`${key}\` must be a boolean.`,
        code: NOT_A_BOOLEAN_CODE,
      });
    }
  }
  return { options, optionDiagnostics };
}
