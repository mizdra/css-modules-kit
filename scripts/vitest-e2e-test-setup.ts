import { execFileSync, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vite-plus/test/node';

// Keep the resolution in sync with `packages/content-mapper/e2e-test/test-util/lsp-client.ts`.
const tsgoBinPath =
  process.env['TSGO_BIN'] ??
  fileURLToPath(
    new URL(`../.tmp/typescript/built/tsgo${process.platform === 'win32' ? '.exe' : ''}`, import.meta.url),
  );

function prepare() {
  if (!existsSync(tsgoBinPath)) {
    if (process.env['TSGO_BIN']) {
      throw new Error(`tsgo binary not found at TSGO_BIN (${tsgoBinPath}).`);
    }
    execFileSync('bash', [fileURLToPath(new URL('./setup-tsgo.sh', import.meta.url))], { stdio: 'inherit' });
  }
  execSync('vp run build', { stdio: 'inherit' });
}

export default function setup(project: TestProject) {
  prepare();
  project.onTestsRerun(() => {
    prepare();
  });
}
