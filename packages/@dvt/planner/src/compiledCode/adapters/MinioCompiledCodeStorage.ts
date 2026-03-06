import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import type { ICompiledCodeStorage } from '../../ports/ICompiledCodeStorage.js';

export interface MinioCompiledCodeStorageOptions {
  bucket: string;
  endpoint: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class MinioCompiledCodeStorage implements ICompiledCodeStorage {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(options: MinioCompiledCodeStorageOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      endpoint: options.endpoint,
      forcePathStyle: true,
      region: options.region ?? 'us-east-1',
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
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
