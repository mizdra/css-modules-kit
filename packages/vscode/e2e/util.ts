import { AssertionError } from 'node:assert';
import { setTimeout } from 'node:timers/promises';

export function toObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Helper function that repeatedly executes `testFn` until it no longer throws an `AssertionError`
export async function waitFor<T>(
  testFn: () => Promise<T>,
  options?: { timeout: number; interval: number },
): Promise<T> {
  const timeout = options?.timeout ?? 5000;
  const interval = options?.interval ?? 50;
  const endTime = Date.now() + timeout;

  while (Date.now() < endTime) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await testFn();
    } catch (error) {
      if (error instanceof AssertionError) {
        // eslint-disable-next-line no-await-in-loop
        await setTimeout(interval);
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Timeout after ${timeout}ms`);
}
