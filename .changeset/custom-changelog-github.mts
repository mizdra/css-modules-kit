import github from '@changesets/changelog-github';
import type { ChangelogFunctions } from '@changesets/types';

const changelogFunctions: ChangelogFunctions = {
  getReleaseLine: async (...args) => {
    const originalResult = await github.getReleaseLine(...args);
    // Remove maintainer credit
    return originalResult.replaceAll('Thanks [@mizdra](https://github.com/mizdra)! ', '');
  },
  getDependencyReleaseLine: github.getDependencyReleaseLine,
};

export default changelogFunctions;
