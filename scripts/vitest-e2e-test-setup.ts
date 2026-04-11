import { execSync } from 'node:child_process';
import type { TestProject } from 'vite-plus/test/node';

export default function setup(project: TestProject) {
  execSync('vp run build', { stdio: 'inherit' });
  project.onTestsRerun(() => {
    execSync('vp run build', { stdio: 'inherit' });
  });
}
