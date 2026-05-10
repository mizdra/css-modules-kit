import { AssertionError } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
// oxlint-disable-next-line no-restricted-imports
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { defineIFFCreator } from '@mizdra/inline-fixture-files';

const fixtureRoot = join(tmpdir(), 'css-modules-kit-vscode-test');
export const createFixture = defineIFFCreator({
  generateRootDir: () => join(fixtureRoot, randomUUID()),
  unixStylePath: true,
});

export function toObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Helper function that repeatedly executes `testFn` until it no longer throws an `AssertionError`
export async function waitFor<T>(
  testFn: () => Promise<T>,
  options?: { timeout: number; interval: number },
): Promise<T> {
  const timeout = options?.timeout ?? 10_000;
  const interval = options?.interval ?? 50;
  const endTime = Date.now() + timeout;

  while (Date.now() < endTime) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      return await testFn();
    } catch (error) {
      if (error instanceof AssertionError) {
        // oxlint-disable-next-line no-await-in-loop
        await setTimeout(interval);
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Timeout after ${timeout}ms`);
}
