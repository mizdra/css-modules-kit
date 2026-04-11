import { execSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';

export default function setup(project: TestProject) {
  execSync('pnpm run build', { stdio: 'inherit' });
  project.onTestsRerun(() => {
    execSync('pnpm run build', { stdio: 'inherit' });
  });
}
