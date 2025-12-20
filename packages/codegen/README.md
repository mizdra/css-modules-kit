# `@css-modules-kit/codegen`

A tool for generating `*.d.ts` files for `*.module.css`.

## Installation

```bash
npm i -D @css-modules-kit/codegen
```

## Requirements

Set `cmkOptions.dtsOutDir` and `"."` to `rootDirs`. This is necessary for the `tsc` command to load the generated `*.d.ts` files.

```json
{
  "compilerOptions": {
    "rootDirs": [".", "generated"] // Required
  },
  "cmkOptions": {
    "dtsOutDir": "generated" // Default is `"generated"`, so it can be omitted
  }
}
```

## Usage

From the command line, run the `cmk` command.

```bash
$ # Generate .d.ts for .module.css
$ npx cmk

$ # Show help
$ npx cmk --help
Usage: cmk [options]

Options:
  --help, -h     Show help information
  --version, -v  Show version number
  --project, -p  The path to its configuration file, or to a folder with a 'tsconfig.json'.
  --pretty       Enable color and formatting in output to make errors easier to read.
  --clean        Remove the output directory before generating files.                       [default: false]
  --watch, -w    Watch for changes and regenerate files.                                    [default: false]
```

## Configuration

See [css-modules-kit's README](https://github.com/mizdra/css-modules-kit?tab=readme-ov-file#configuration).
