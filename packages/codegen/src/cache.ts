import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from '@css-modules-kit/core';
import type { CMKConfig } from '@css-modules-kit/core';
import packageJson from '../package.json' with { type: 'json' };

interface CacheData {
  version: string;
  configHash: string;
  files: Record<string, string>;
}

function computeConfigHash(config: CMKConfig): string {
  return createHash('sha256').update(JSON.stringify(config)).digest('hex');
}

function computeContentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export class Cache {
  readonly filePath: string;
  private readonly configHash: string;
  private readonly basePath: string;
  // Use a null-prototype object so that keys like `__proto__` are stored as own properties
  // without interfering with the prototype chain.
  private files: Record<string, string> = Object.create(null);

  constructor(config: CMKConfig) {
    this.filePath = join(config.dtsOutDir, '.cache');
    this.configHash = computeConfigHash(config);
    this.basePath = config.basePath;
  }

  async load(): Promise<void> {
    let text: string;
    try {
      text = await readFile(this.filePath, 'utf-8');
    } catch {
      return;
    }
    let data: CacheData;
    try {
      data = JSON.parse(text);
    } catch {
      return;
    }
    if (data.version !== packageJson.version || data.configHash !== this.configHash) {
      return;
    }
    this.files = Object.assign(Object.create(null), data.files);
  }

  isHit(fileName: string, text: string): boolean {
    const relPath = relative(this.basePath, fileName);
    return this.files[relPath] === computeContentHash(text);
  }

  record(fileName: string, text: string): void {
    const relPath = relative(this.basePath, fileName);
    this.files[relPath] = computeContentHash(text);
  }

  async save(): Promise<void> {
    const data: CacheData = {
      version: packageJson.version,
      configHash: this.configHash,
      files: this.files,
    };
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(data));
  }
}
