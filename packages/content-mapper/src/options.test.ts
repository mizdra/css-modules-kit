import { expect, test } from 'vite-plus/test';
import { normalizeMapperOptions } from './options.js';

const defaultOptions = {
  namedExports: false,
  prioritizeNamedImports: false,
  animation: true,
  dashedIdents: false,
  container: false,
};

test('returns default options when raw options are undefined', () => {
  expect(normalizeMapperOptions(undefined)).toEqual({ options: defaultOptions, optionDiagnostics: [] });
});

test('applies boolean options', () => {
  expect(
    normalizeMapperOptions({
      namedExports: true,
      prioritizeNamedImports: true,
      animation: false,
      dashedIdents: true,
      container: true,
    }),
  ).toEqual({
    options: {
      namedExports: true,
      prioritizeNamedImports: true,
      animation: false,
      dashedIdents: true,
      container: true,
    },
    optionDiagnostics: [],
  });
});

test('ignores unknown keys', () => {
  expect(normalizeMapperOptions({ unknown: true })).toEqual({ options: defaultOptions, optionDiagnostics: [] });
});

test('reports a diagnostic and returns default options when raw options are not an object', () => {
  expect(normalizeMapperOptions('yes')).toEqual({
    options: defaultOptions,
    optionDiagnostics: [{ path: [], messageText: 'Options must be an object.', code: 1001 }],
  });
});

test('reports a diagnostic at the option key and keeps the default when an option is not a boolean', () => {
  expect(normalizeMapperOptions({ animation: 'yes' })).toEqual({
    options: defaultOptions,
    optionDiagnostics: [{ path: ['animation'], messageText: '`animation` must be a boolean.', code: 1002 }],
  });
});
