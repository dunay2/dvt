import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

  async upload(sha256: string, content: Buffer): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: sha256,
        Body: content,
        ContentType: 'text/plain; charset=utf-8',
      })
    );
    return `s3://${this.bucket}/${sha256}`;
  }
}
