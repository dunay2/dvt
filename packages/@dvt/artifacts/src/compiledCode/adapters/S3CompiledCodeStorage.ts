import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ArtifactStoreError } from '@dvt/contracts';

import type { ICompiledCodeStorage } from '../../ports/ICompiledCodeStorage.js';

export interface S3CompiledCodeStorageOptions {
  bucket: string;
  client: S3Client;
}

export class S3CompiledCodeStorage implements ICompiledCodeStorage {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(options: S3CompiledCodeStorageOptions) {
    this.bucket = options.bucket;
    this.client = options.client;
  }

  private key(tenantId: string, sha256: string): string {
    return `tenants/${tenantId}/${sha256}`;
  }

  async upload(tenantId: string, sha256: string, content: Buffer): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key(tenantId, sha256),
        Body: content,
        ContentType: 'text/plain; charset=utf-8',
      })
    );
    return `s3://${this.bucket}/tenants/${tenantId}/${sha256}`;
  }

  async read(tenantId: string, sha256: string): Promise<Buffer> {
    let response;
    try {
      response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.key(tenantId, sha256) })
      );
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NoSuchKey' || name === 'NotFound') {
        throw ArtifactStoreError.notFound(tenantId, sha256, err);
      }
      throw ArtifactStoreError.uploadFailed(
        `S3 read failed: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
    }
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) {
      throw ArtifactStoreError.notFound(tenantId, sha256);
    }
    return Buffer.from(bytes);
  }

  async exists(tenantId: string, sha256: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.key(tenantId, sha256) })
      );
      return true;
    } catch {
      return false;
    }
  }
}
