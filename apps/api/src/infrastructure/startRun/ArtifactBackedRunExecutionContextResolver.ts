import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  parseRunExecutionContext,
  type RunExecutionContext,
  type RunExecutionContextRef,
} from '@dvt/contracts';
import {
  RunExecutionContextRejectedError,
  type IRunExecutionContextResolver,
} from '@dvt/engine';

type S3LikeClient = Pick<S3Client, 'send'>;

export interface ArtifactBackedRunExecutionContextResolverOptions {
  readonly nodeEnv?: string;
  readonly s3Client?: S3LikeClient;
}

export class ArtifactBackedRunExecutionContextResolver implements IRunExecutionContextResolver {
  private readonly nodeEnv: string;
  private readonly s3Client: S3LikeClient;

  public constructor(options?: ArtifactBackedRunExecutionContextResolverOptions) {
    this.nodeEnv = options?.nodeEnv ?? process.env['NODE_ENV'] ?? 'development';
    this.s3Client = options?.s3Client ?? new S3Client({});
  }

  public async resolve(ref: RunExecutionContextRef): Promise<RunExecutionContext> {
    const uri = this.parseUri(ref.uri);
    const bytes = await this.readArtifactBytes(uri);
    this.assertSha256(bytes, ref.sha256);
    const resolved = this.parseRunExecutionContext(bytes);

    this.assertRefAlignment(ref, resolved);
    return resolved;
  }

  private parseUri(uri: string): URL {
    try {
      return new URL(uri);
    } catch (error) {
      throw this.reject(`unsupported runExecutionContextRef URI scheme: ${this.readSchemeToken(uri)}`, {
        cause: error,
      });
    }
  }

  private async readArtifactBytes(uri: URL): Promise<Uint8Array> {
    const scheme = this.normalizeScheme(uri.protocol);

    if (scheme === 's3') {
      return this.readS3Artifact(uri);
    }

    if (scheme === 'file') {
      if (this.nodeEnv === 'production') {
        throw this.reject('file:// runExecutionContextRef is not allowed in production');
      }

      return this.readFileArtifact(uri);
    }

    throw this.reject(`unsupported runExecutionContextRef URI scheme: ${scheme}`);
  }

  private async readFileArtifact(uri: URL): Promise<Uint8Array> {
    try {
      return await readFile(fileURLToPath(uri));
    } catch (error) {
      if (this.isMissingFileError(error)) {
        throw this.reject('runExecutionContext artifact could not be found', { cause: error });
      }

      throw error;
    }
  }

  private async readS3Artifact(uri: URL): Promise<Uint8Array> {
    const bucket = uri.hostname;
    const key = uri.pathname.slice(1);

    this.assertValidS3Locator(bucket, key);

    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      return await this.readS3ResponseBody(response.Body);
    } catch (error) {
      if (this.isS3NotFoundError(error)) {
        throw this.reject('runExecutionContext artifact could not be found', { cause: error });
      }

      throw error;
    }
  }

  private assertValidS3Locator(bucket: string, key: string): void {
    if (bucket.length > 0 && key.length > 0) {
      return;
    }

    const detail =
      bucket.length === 0 && key.length === 0
        ? 'missing bucket and key'
        : bucket.length === 0
          ? 'missing bucket'
          : 'missing key';

    throw this.reject(`runExecutionContext artifact locator is invalid: ${detail}`);
  }

  private async readS3ResponseBody(body: unknown): Promise<Uint8Array> {
    if (body && typeof body === 'object' && 'transformToByteArray' in body) {
      const transformToByteArray = (body as { transformToByteArray?: () => Promise<Uint8Array> })
        .transformToByteArray;
      if (typeof transformToByteArray === 'function') {
        return transformToByteArray.call(body);
      }
    }

    if (body instanceof Uint8Array) {
      return body;
    }

    if (typeof body === 'string') {
      return Buffer.from(body, 'utf8');
    }

    throw this.reject('runExecutionContext artifact payload is invalid');
  }

  private assertSha256(bytes: Uint8Array, expectedSha256: string): void {
    const actualSha256 = createHash('sha256').update(bytes).digest('hex');
    if (actualSha256 !== expectedSha256) {
      throw this.reject('runExecutionContext artifact integrity mismatch');
    }
  }

  private parseRunExecutionContext(bytes: Uint8Array): RunExecutionContext {
    let parsed: unknown;

    try {
      parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
    } catch (error) {
      throw this.reject('runExecutionContext artifact payload is invalid', { cause: error });
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw this.reject('runExecutionContext artifact payload is invalid');
    }

    try {
      return parseRunExecutionContext(parsed);
    } catch (error) {
      throw this.reject('runExecutionContext artifact payload is invalid', { cause: error });
    }
  }

  private assertRefAlignment(
    ref: RunExecutionContextRef,
    resolved: RunExecutionContext
  ): void {
    if (resolved.schemaVersion !== ref.schemaVersion) {
      throw this.reject(
        `runExecutionContext.schemaVersion mismatch: ref=${ref.schemaVersion} actual=${resolved.schemaVersion}`
      );
    }
    if (resolved.planId !== ref.planId) {
      throw this.reject(`runExecutionContext.planId mismatch: ref=${ref.planId} actual=${resolved.planId}`);
    }
    if (resolved.planVersion !== ref.planVersion) {
      throw this.reject(
        `runExecutionContext.planVersion mismatch: ref=${ref.planVersion} actual=${resolved.planVersion}`
      );
    }
    if (
      ref.pluginCompatibilityFingerprint !== undefined &&
      resolved.pluginCompatibilityFingerprint === undefined
    ) {
      throw this.reject(
        'runExecutionContext.pluginCompatibilityFingerprint missing in resolved artifact'
      );
    }
    if (
      ref.pluginCompatibilityFingerprint !== undefined &&
      resolved.pluginCompatibilityFingerprint !== undefined &&
      resolved.pluginCompatibilityFingerprint !== ref.pluginCompatibilityFingerprint
    ) {
      throw this.reject(
        'runExecutionContext.pluginCompatibilityFingerprint mismatch between ref and resolved artifact'
      );
    }
  }

  private normalizeScheme(protocol: string): string {
    return protocol.replace(/:$/, '').toLowerCase();
  }

  private readSchemeToken(uri: string): string {
    const token = uri.split(':', 1)[0]?.trim().toLowerCase();
    return token && token.length > 0 ? token : 'unknown';
  }

  private isMissingFileError(error: unknown): boolean {
    return (
      error instanceof Error &&
      ((error as Error & { code?: unknown }).code === 'ENOENT' ||
        (error as Error & { code?: unknown }).code === 'ENOTDIR')
    );
  }

  private isS3NotFoundError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const name = (error as Error & { name?: unknown }).name;
    if (name === 'NoSuchKey' || name === 'NotFound') {
      return true;
    }

    const statusCode = (error as Error & { $metadata?: { httpStatusCode?: unknown } }).$metadata
      ?.httpStatusCode;
    return statusCode === 404;
  }

  private reject(
    reason: string,
    options?: {
      cause?: unknown;
    }
  ): RunExecutionContextRejectedError {
    void options;
    return new RunExecutionContextRejectedError(reason);
  }
}
