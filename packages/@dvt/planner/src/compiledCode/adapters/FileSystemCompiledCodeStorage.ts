import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { ArtifactStoreError } from '@dvt/contracts';

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

  private tenantPath(tenantId: string, sha256: string): string {
    return join(this.directory, 'tenants', tenantId, sha256);
  }

  async upload(tenantId: string, sha256: string, content: Buffer): Promise<string> {
    const absolutePath = this.tenantPath(tenantId, sha256);
    await mkdir(join(this.directory, 'tenants', tenantId), { recursive: true });
    await writeFile(absolutePath, content);
    return pathToFileURL(absolutePath).href;
  }

  async read(tenantId: string, sha256: string): Promise<Buffer> {
    try {
      return await readFile(this.tenantPath(tenantId, sha256));
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new ArtifactStoreError(
          `Artifact not found: tenant=${tenantId} sha256=${sha256}`,
          'ARTIFACT_NOT_FOUND'
        );
      }
      throw new ArtifactStoreError(
        `FS read failed: ${err instanceof Error ? err.message : String(err)}`,
        'ARTIFACT_UPLOAD_FAILED'
      );
    }
  }

  async exists(tenantId: string, sha256: string): Promise<boolean> {
    try {
      await readFile(this.tenantPath(tenantId, sha256));
      return true;
    } catch {
      return false;
    }
  }
}
