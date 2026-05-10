import { defineConfig } from '@vscode/test-cli';

const baseConfig = {
  extensionDevelopmentPath: 'packages/vscode',
  version: process.env.VSCODE_VERSION ?? 'stable',
  mocha: {
    timeout: 30_000,
    require: ['tsx/esm', './scripts/vscode-test-setup.ts'],
  },
  download: {
    timeout: 60_000,
  },
};

export default defineConfig([
  {
    ...baseConfig,
    label: 'open-css-file',
    files: 'packages/vscode/vscode-test/open-css-file.test.ts',
    workspaceFolder: 'examples/1-basic',
  },
  {
    ...baseConfig,
    label: 'open-ts-file',
    files: 'packages/vscode/vscode-test/open-ts-file.test.ts',
    workspaceFolder: 'examples/1-basic',
  },
  {
    ...baseConfig,
    label: 'request-forwarding-to-tsserver',
    files: 'packages/vscode/vscode-test/request-forwarding-to-tsserver.test.ts',
    workspaceFolder: 'examples/4-multiple-tsconfig',
  },
]);
