import { describe, expect, test } from 'vite-plus/test';
import { slash } from './path.js';

describe('slash', () => {
  test('should convert backslashes to slashes', () => {
    expect(slash('a\\b\\c')).toBe('a/b/c');
    expect(slash('C:\\\\a\\b\\c')).toBe('C:/a/b/c');
    expect(slash('\\\\server\\share\\file')).toBe('//server/share/file');
    expect(slash('\\\\?\\C:\\a\\b\\c')).toBe('//?/C:/a/b/c');
  });
});
