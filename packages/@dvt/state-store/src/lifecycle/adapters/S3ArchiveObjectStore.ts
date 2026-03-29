import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import type { ArchiveObjectWriteResult, IArchiveObjectStore } from '../archiveRuntime.js';

export interface S3ArchiveObjectStoreOptions {
  bucket: string;
  client: S3Client;
}

export class S3ArchiveObjectStore implements IArchiveObjectStore {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor(options: S3ArchiveObjectStoreOptions) {
    this.bucket = options.bucket;
    this.client = options.client;
  }

  async putObject(
    objectKey: string,
    content: Buffer,
    contentType: string
  ): Promise<ArchiveObjectWriteResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: content,
        ContentType: contentType,
      })
    );

    return {
      objectKey,
      uri: `s3://${this.bucket}/${objectKey}`,
    };
  }

  async readObject(objectKey: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      })
    );

    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) {
      throw new Error(`ARCHIVE_OBJECT_NOT_FOUND: ${objectKey}`);
    }

    return Buffer.from(bytes);
  }

  async existsObject(objectKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  getObjectUri(objectKey: string): string {
    return `s3://${this.bucket}/${objectKey}`;
  }
}
