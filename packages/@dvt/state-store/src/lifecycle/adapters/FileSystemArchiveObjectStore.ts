import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ArchiveObjectWriteResult, IArchiveObjectStore } from '../archiveRuntime.js';

export interface FileSystemArchiveObjectStoreOptions {
  directory: string;
}

export class FileSystemArchiveObjectStore implements IArchiveObjectStore {
  private readonly directory: string;

  constructor(options: FileSystemArchiveObjectStoreOptions) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('file:// archive storage is prohibited in production');
    }
    this.directory = options.directory;
  }

  async putObject(
    objectKey: string,
    content: Buffer,
    _contentType: string
  ): Promise<ArchiveObjectWriteResult> {
    const absolutePath = this.toAbsolutePath(objectKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
    return {
      objectKey,
      uri: pathToFileURL(absolutePath).href,
    };
  }

  async readObject(objectKey: string): Promise<Buffer> {
    return readFile(this.toAbsolutePath(objectKey));
  }

  async existsObject(objectKey: string): Promise<boolean> {
    try {
      await readFile(this.toAbsolutePath(objectKey));
      return true;
    } catch {
      return false;
    }
  }

  private toAbsolutePath(objectKey: string): string {
    const normalizedKey = objectKey.trim().replaceAll('\\', '/');
    if (!normalizedKey) {
      throw new Error('ARCHIVE_OBJECT_KEY_REQUIRED');
    }
    return join(this.directory, ...normalizedKey.split('/'));
  }
}
