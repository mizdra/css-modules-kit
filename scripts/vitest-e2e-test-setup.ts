import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { TestProject } from 'vite-plus/test/node';

// Keep the resolution in sync with `packages/content-mapper/e2e-test/test-util/lsp-client.ts`.
const tsgoBinPath = process.env['TSGO_BIN'] ?? resolveNativeTscBinPath();

/**
 * Resolves the platform-specific native tsc binary the same way as `typescript/lib/getExePath.js`.
 * The `typescript` nightly is a devDependency of `packages/content-mapper` under the
 * `typescript-nightly` alias, and its platform package is a dependency of the nightly, so each
 * must be resolved from its dependent package to work with pnpm's non-flat `node_modules`.
 */
function resolveNativeTscBinPath(): string {
  const contentMapperPkgPath = fileURLToPath(new URL('../packages/content-mapper/package.json', import.meta.url));
  const typescriptPkgPath = createRequire(contentMapperPkgPath).resolve('typescript-nightly/package.json');
  const platformPkgName = `@typescript/typescript-${process.platform}-${process.arch}`;
  const platformPkgPath = createRequire(typescriptPkgPath).resolve(`${platformPkgName}/package.json`);
  const binName = process.platform === 'win32' ? 'tsc.exe' : 'tsc';
  return fileURLToPath(new URL(`./lib/${binName}`, pathToFileURL(platformPkgPath)));
}

function prepare() {
  if (!existsSync(tsgoBinPath)) {
    if (process.env['TSGO_BIN']) {
      throw new Error(`tsgo binary not found at TSGO_BIN (${tsgoBinPath}).`);
    }
    throw new Error(`Native tsc binary not found at ${tsgoBinPath}. Run \`pnpm install\` to install it.`);
  }
  execSync('vp run build', { stdio: 'inherit' });
}

export default function setup(project: TestProject) {
  prepare();
  project.onTestsRerun(() => {
    prepare();
  });
}
