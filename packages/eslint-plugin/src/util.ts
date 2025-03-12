import fs from 'node:fs';

export function readFile(path: string): string {
  return fs.readFileSync(path, 'utf-8');
}
