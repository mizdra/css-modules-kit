import { execSync } from 'node:child_process';
// oxlint-disable-next-line no-restricted-imports
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

export function mochaGlobalSetup() {
  execSync('vp run build', { stdio: 'inherit', cwd: root });
}
