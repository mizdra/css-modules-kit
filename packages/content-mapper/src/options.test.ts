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
  expect(normalizeMapperOptions(undefined)).toEqual({ options: defaultOptions, errors: [] });
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
    errors: [],
  });
});

test('ignores unknown keys', () => {
  expect(normalizeMapperOptions({ unknown: true })).toEqual({ options: defaultOptions, errors: [] });
});

test('reports an error and returns default options when raw options are not an object', () => {
  expect(normalizeMapperOptions('yes')).toEqual({
    options: defaultOptions,
    errors: ['Options must be an object.'],
  });
});

test('reports an error and keeps the default when an option is not a boolean', () => {
  expect(normalizeMapperOptions({ animation: 'yes' })).toEqual({
    options: defaultOptions,
    errors: ['`animation` must be a boolean.'],
  });
});
