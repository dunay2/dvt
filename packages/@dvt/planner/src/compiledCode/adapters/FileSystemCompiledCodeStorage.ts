import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ICompiledCodeStorage } from '../../ports/ICompiledCodeStorage.js';

export interface FileSystemCompiledCodeStorageOptions {
  directory: string;
}

export class FileSystemCompiledCodeStorage implements ICompiledCodeStorage {
  private readonly directory: string;

  constructor(options: FileSystemCompiledCodeStorageOptions) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('file:// storage is prohibited in production');
    }
    this.directory = options.directory;
  }

  async upload(sha256: string, content: Buffer): Promise<string> {
    await mkdir(this.directory, { recursive: true });
    const absolutePath = join(this.directory, sha256);
    await writeFile(absolutePath, content);
    return pathToFileURL(absolutePath).href;
  }
}
