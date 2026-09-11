import { createHash, randomUUID } from 'node:crypto';
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  unlink,
  type FileHandle,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ArtifactStoreError } from '@dvt/contracts';

import type {
  IContentAddressedArtifactStore,
  PublishContentAddressedArtifactInput,
  PublishedContentAddressedArtifact,
} from './IContentAddressedArtifactStore.js';

export interface FileContentAddressedArtifactStoreOptions {
  readonly rootPath: string;
}

export class FileContentAddressedArtifactStore implements IContentAddressedArtifactStore {
  private readonly rootPath: string;

  public constructor(options: FileContentAddressedArtifactStoreOptions) {
    this.rootPath = path.resolve(options.rootPath);
  }

  public async publish(
    input: PublishContentAddressedArtifactInput
  ): Promise<PublishedContentAddressedArtifact> {
    input.abortSignal?.throwIfAborted();
    validateBytes(input);
    const artifactPath = parseAndValidateLocator(this.rootPath, input);
    const artifactDirectory = path.dirname(artifactPath);
    await mkdir(this.rootPath, { recursive: true });
    await mkdir(artifactDirectory, { recursive: true });
    await assertDirectoryWithinRoot(this.rootPath, artifactDirectory);

    const temporaryPath = path.join(
      artifactDirectory,
      `.${path.basename(artifactPath)}.${randomUUID()}.tmp`
    );
    let handle: FileHandle | undefined;
    let temporaryCreated = false;

    try {
      handle = await open(temporaryPath, 'wx');
      temporaryCreated = true;
      await writeAll(handle, input.bytes);
      await handle.sync();
      await handle.close();
      handle = undefined;
      input.abortSignal?.throwIfAborted();

      try {
        await link(temporaryPath, artifactPath);
        return receipt(input, 'created');
      } catch (error) {
        if (!isAlreadyExistsError(error)) throw error;
      }

      await validateExistingArtifact(artifactPath, input);
      return receipt(input, 'verified-existing');
    } catch (error) {
      if (error instanceof ArtifactStoreError || isAbortError(error)) throw error;
      throw ArtifactStoreError.uploadFailed('file content-addressed publication failed', error);
    } finally {
      if (handle !== undefined) {
        await handle.close().catch(() => undefined);
      }
      if (temporaryCreated) {
        await unlink(temporaryPath).catch((error: unknown) => {
          if (!isMissingFileError(error)) throw error;
        });
      }
    }
  }
}

export function locateFileContentAddressedArtifact(input: {
  readonly rootPath: string;
  readonly tenantId: string;
  readonly sha256: string;
}): string {
  return pathToFileURL(
    path.join(
      path.resolve(input.rootPath),
      'tenants',
      encodeFileTenantPathSegment(input.tenantId),
      input.sha256
    )
  ).href;
}

export function encodeFileTenantPathSegment(tenantId: string): string {
  return encodeURIComponent(tenantId);
}

function parseAndValidateLocator(
  rootPath: string,
  input: PublishContentAddressedArtifactInput
): string {
  let uri: globalThis.URL;
  try {
    uri = new globalThis.URL(input.storageUri);
  } catch (error) {
    throw ArtifactStoreError.uploadFailed('artifact storage URI is invalid', error);
  }
  if (uri.protocol !== 'file:' || uri.hostname.length > 0) {
    throw ArtifactStoreError.uploadFailed('artifact storage URI is not a local file locator');
  }

  const artifactPath = path.resolve(fileURLToPath(uri));
  const relativePath = path.relative(rootPath, artifactPath);
  if (
    relativePath === '' ||
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw ArtifactStoreError.uploadFailed('artifact storage URI resolves outside its root');
  }

  const parts = relativePath.split(path.sep);
  if (parts.length !== 3 || parts[0] !== 'tenants') {
    throw ArtifactStoreError.uploadFailed('artifact storage URI is not content-addressed');
  }
  const expectedTenantSegment = encodeFileTenantPathSegment(input.tenantId);
  if (parts[1] !== expectedTenantSegment) {
    throw ArtifactStoreError.tenantMismatch(input.tenantId, decodeTenantSegment(parts[1]));
  }
  if (parts[2] !== input.sha256) {
    throw ArtifactStoreError.integrityDigestMismatch(input.sha256, parts[2] ?? 'missing');
  }

  return artifactPath;
}

async function assertDirectoryWithinRoot(rootPath: string, directoryPath: string): Promise<void> {
  const [canonicalRoot, canonicalDirectory] = await Promise.all([
    realpath(rootPath),
    realpath(directoryPath),
  ]);
  const relativePath = path.relative(canonicalRoot, canonicalDirectory);
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw ArtifactStoreError.uploadFailed('artifact directory resolves outside its root');
  }
}

function validateBytes(input: PublishContentAddressedArtifactInput): void {
  if (input.bytes.byteLength !== input.sizeBytes) {
    throw ArtifactStoreError.integritySizeMismatch(input.sizeBytes, input.bytes.byteLength);
  }
  const actualSha256 = sha256Hex(input.bytes);
  if (actualSha256 !== input.sha256) {
    throw ArtifactStoreError.integrityDigestMismatch(input.sha256, actualSha256);
  }
}

async function validateExistingArtifact(
  artifactPath: string,
  input: PublishContentAddressedArtifactInput
): Promise<void> {
  const metadata = await lstat(artifactPath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw ArtifactStoreError.uploadFailed('existing artifact is not a regular file');
  }
  if (metadata.size !== input.sizeBytes) {
    throw ArtifactStoreError.integritySizeMismatch(input.sizeBytes, metadata.size);
  }

  const existing = await readFile(artifactPath);
  const actualSha256 = sha256Hex(existing);
  if (actualSha256 !== input.sha256) {
    throw ArtifactStoreError.integrityDigestMismatch(input.sha256, actualSha256);
  }
}

async function writeAll(handle: FileHandle, bytes: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const result = await handle.write(bytes, offset, bytes.byteLength - offset, null);
    if (result.bytesWritten === 0) {
      throw ArtifactStoreError.uploadFailed('file content-addressed write made no progress');
    }
    offset += result.bytesWritten;
  }
}

function receipt(
  input: PublishContentAddressedArtifactInput,
  disposition: PublishedContentAddressedArtifact['disposition']
): PublishedContentAddressedArtifact {
  return {
    disposition,
    storageUri: input.storageUri,
    sha256: input.sha256,
    sizeBytes: input.sizeBytes,
    mediaType: input.mediaType,
  };
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function decodeTenantSegment(segment: string | undefined): string {
  if (segment === undefined) return 'missing';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function isAlreadyExistsError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
