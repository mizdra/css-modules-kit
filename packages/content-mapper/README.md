# `@css-modules-kit/content-mapper`

A TypeScript content mapper that provides the language features of css-modules-kit on TypeScript 7.

> [!WARNING]
> This package is experimental. Breaking changes may be introduced in any release.

Only a part of the features of `@css-modules-kit/ts-plugin` is available. See [the support status](https://github.com/mizdra/css-modules-kit/blob/main/docs/content-mapper.md) for details.

## Installation

This package requires TypeScript 7.1 or later.

```bash
npm i -D @css-modules-kit/content-mapper
```

## Usage

Register the package in `tsconfig.json`.

```json
{
  "contentMappers": [
    {
      "package": "@css-modules-kit/content-mapper",
      "extensions": [".css"]
    }
  ]
}
```

To type-check from the command line, pass `--runExternalCode` to `tsc`.

```bash
npx tsc --noEmit --runExternalCode
```
