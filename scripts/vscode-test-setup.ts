import { execSync } from 'node:child_process';
// eslint-disable-next-line no-restricted-imports
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');

export function mochaGlobalSetup() {
  execSync('npm run build', { stdio: 'inherit', cwd: root });
}
