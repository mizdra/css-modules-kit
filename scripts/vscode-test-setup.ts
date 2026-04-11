import { execSync } from 'node:child_process';
// oxlint-disable-next-line no-restricted-imports
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');

export function mochaGlobalSetup() {
  execSync('pnpm run build', { stdio: 'inherit', cwd: root });
}
