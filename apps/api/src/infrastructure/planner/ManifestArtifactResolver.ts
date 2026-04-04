import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { DbtManifestRef, GenericGraphSourceV1 } from '@dvt/contracts';
import {
  PlannerErrorCode,
  derivePlannerGraphSourceFromManifest,
  type IArtifactResolver,
} from '@dvt/planner';

import {
  formatManifestArtifactResolutionReason,
  ManifestArtifactResolutionError,
  MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND,
} from '../../application/errors/ManifestArtifactResolutionError.js';

type S3LikeClient = Pick<S3Client, 'send'>;

export interface ManifestArtifactResolverOptions {
  readonly nodeEnv?: string;
  readonly s3Client?: S3LikeClient;
}

export class ManifestArtifactResolver implements IArtifactResolver {
  private readonly nodeEnv: string;
  private readonly s3Client: S3LikeClient;

  public constructor(options?: ManifestArtifactResolverOptions) {
    this.nodeEnv = options?.nodeEnv ?? process.env['NODE_ENV'] ?? 'development';
    this.s3Client = options?.s3Client ?? new S3Client({});
  }

  public async resolveGraphSource(ref: DbtManifestRef): Promise<GenericGraphSourceV1> {
    const uri = this.parseUri(ref.uri);
    const bytes = await this.readArtifactBytes(uri);
    this.assertSha256(bytes, ref.sha256);

    return this.parseGraphSource(bytes);
  }

  private parseUri(uri: string): URL {
    try {
      return new URL(uri);
    } catch (error) {
      throw new ManifestArtifactResolutionError(
        MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.unsupportedScheme,
        formatManifestArtifactResolutionReason(
          MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.unsupportedScheme,
          this.readSchemeToken(uri)
        ),
        { cause: error, detail: this.readSchemeToken(uri) }
      );
    }
  }

  private async readArtifactBytes(uri: URL): Promise<Uint8Array> {
    const scheme = this.normalizeScheme(uri.protocol);

    if (scheme === 's3') {
      return this.readS3Artifact(uri);
    }

    if (scheme === 'file') {
      if (this.nodeEnv === 'production') {
        throw new ManifestArtifactResolutionError(
          MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.fileSchemeProhibited,
          formatManifestArtifactResolutionReason(
            MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.fileSchemeProhibited
          )
        );
      }

      return this.readFileArtifact(uri);
    }

    throw new ManifestArtifactResolutionError(
      MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.unsupportedScheme,
      formatManifestArtifactResolutionReason(
        MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.unsupportedScheme,
        scheme
      ),
      { detail: scheme }
    );
  }

  private async readFileArtifact(uri: URL): Promise<Uint8Array> {
    try {
      return await readFile(fileURLToPath(uri));
    } catch (error) {
      if (this.isMissingFileError(error)) {
        throw new ManifestArtifactResolutionError(
          MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.artifactNotFound,
          formatManifestArtifactResolutionReason(
            MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.artifactNotFound
          ),
          { cause: error }
        );
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
        throw new ManifestArtifactResolutionError(
          MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.artifactNotFound,
          formatManifestArtifactResolutionReason(
            MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.artifactNotFound
          ),
          { cause: error }
        );
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

    throw new ManifestArtifactResolutionError(
      MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidArtifactLocator,
      formatManifestArtifactResolutionReason(
        MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidArtifactLocator,
        detail
      ),
      { detail }
    );
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

    throw new ManifestArtifactResolutionError(
      MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidManifestPayload,
      formatManifestArtifactResolutionReason(
        MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidManifestPayload
      )
    );
  }

  private assertSha256(bytes: Uint8Array, expectedSha256: string): void {
    const actualSha256 = createHash('sha256').update(bytes).digest('hex');
    if (actualSha256 !== expectedSha256) {
      throw new ManifestArtifactResolutionError(
        MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.integrityMismatch,
        formatManifestArtifactResolutionReason(
          MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.integrityMismatch
        )
      );
    }
  }

  private parseGraphSource(bytes: Uint8Array): GenericGraphSourceV1 {
    let parsed: unknown;

    try {
      parsed = JSON.parse(Buffer.from(bytes).toString('utf8'));
    } catch (error) {
      throw new ManifestArtifactResolutionError(
        MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidManifestPayload,
        formatManifestArtifactResolutionReason(
          MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidManifestPayload
        ),
        { cause: error }
      );
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ManifestArtifactResolutionError(
        MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidManifestPayload,
        formatManifestArtifactResolutionReason(
          MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidManifestPayload
        )
      );
    }

    try {
      return derivePlannerGraphSourceFromManifest(parsed as Record<string, unknown>);
    } catch (error) {
      if (this.isPlannerInvalidInputError(error)) {
        throw new ManifestArtifactResolutionError(
          MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidManifestPayload,
          formatManifestArtifactResolutionReason(
            MANIFEST_ARTIFACT_RESOLUTION_ERROR_KIND.invalidManifestPayload
          ),
          { cause: error }
        );
      }

      throw error;
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

    const metadata = (error as Error & { $metadata?: { httpStatusCode?: unknown } }).$metadata;
    return metadata?.httpStatusCode === 404;
  }

  private isPlannerInvalidInputError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error as Error & { code?: unknown }).code === PlannerErrorCode.INVALID_INPUT
    );
  }
}
