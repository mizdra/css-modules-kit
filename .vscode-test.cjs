const { defineConfig } = require('@vscode/test-cli');
const { execSync } = require('node:child_process');

execSync('npm run build', { stdio: 'inherit' });

const baseConfig = /** @type {const} */ ({
  extensionDevelopmentPath: 'packages/vscode',
  workspaceFolder: 'examples/1-basic',
  version: process.env.VSCODE_VERSION ?? 'stable',
  mocha: {
    timeout: 10000,
    require: ['tsx/cjs'],
  },
});

module.exports = defineConfig([
  {
    ...baseConfig,
    files: 'packages/vscode/e2e/open-css-file.test.ts',
    workspaceFolder: 'examples/1-basic',
  },
  {
    ...baseConfig,
    files: 'packages/vscode/e2e/open-ts-file.test.ts',
    workspaceFolder: 'examples/1-basic',
  },
  {
    ...baseConfig,
    files: 'packages/vscode/e2e/request-forwarding-to-tsserver.test.ts',
    workspaceFolder: 'examples/4-multiple-tsconfig',
  },
]);
