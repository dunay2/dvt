/** Owned concern: create immutable file artifacts idempotently and reject content drift. */
import { randomUUID } from 'node:crypto';
import { link, mkdir, open, readFile, unlink, type FileHandle } from 'node:fs/promises';
import path from 'node:path';

export async function writeImmutableFileArtifact(
  artifactPath: string,
  bytes: Buffer,
  io: ImmutableFileArtifactIo = DEFAULT_IO
): Promise<void> {
  const artifactDirectory = path.dirname(artifactPath);
  await io.mkdir(artifactDirectory, { recursive: true });
  const temporaryPath = path.join(
    artifactDirectory,
    `.${path.basename(artifactPath)}.${randomUUID()}.tmp`
  );
  let handle: FileHandle | null = null;
  let temporaryArtifactCreated = false;
  let operationFailed = false;
  let operationError: unknown;
  try {
    handle = await io.open(temporaryPath, 'wx');
    temporaryArtifactCreated = true;
    await writeAll(handle, bytes);
    await handle.sync();
    await handle.close();
    handle = null;
    await publishArtifact(io, temporaryPath, artifactPath, bytes);
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }

  const cleanupErrors = await cleanupTemporaryArtifact(
    io,
    temporaryPath,
    handle,
    temporaryArtifactCreated
  );
  if (operationFailed) {
    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [operationError, ...cleanupErrors],
        'Immutable artifact operation failed and its temporary file could not be removed.',
        { cause: operationError }
      );
    }
    throw operationError;
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      'Immutable artifact temporary file could not be removed.'
    );
  }
}

export interface ImmutableFileArtifactIo {
  readonly link: typeof link;
  readonly mkdir: typeof mkdir;
  readonly open: typeof open;
  readonly readFile: typeof readFile;
  readonly unlink: typeof unlink;
}

const DEFAULT_IO: ImmutableFileArtifactIo = { link, mkdir, open, readFile, unlink };

async function writeAll(handle: FileHandle, bytes: Buffer): Promise<void> {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const result = await handle.write(bytes, offset, bytes.byteLength - offset, null);
    if (result.bytesWritten === 0) throw new Error('Immutable artifact write made no progress.');
    offset += result.bytesWritten;
  }
}

function isAlreadyExistsError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}

async function publishArtifact(
  io: ImmutableFileArtifactIo,
  temporaryPath: string,
  artifactPath: string,
  bytes: Buffer
): Promise<void> {
  try {
    await io.link(temporaryPath, artifactPath);
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
    const existing = await io.readFile(artifactPath);
    if (!existing.equals(bytes)) {
      throw new Error('The immutable artifact already exists with different content.', {
        cause: error,
      });
    }
  }
}

async function cleanupTemporaryArtifact(
  io: ImmutableFileArtifactIo,
  temporaryPath: string,
  handle: FileHandle | null,
  temporaryArtifactCreated: boolean
): Promise<unknown[]> {
  const errors: unknown[] = [];
  if (handle !== null) {
    try {
      await handle.close();
    } catch (error) {
      errors.push(error);
    }
  }
  if (temporaryArtifactCreated) {
    try {
      await io.unlink(temporaryPath);
    } catch (error) {
      if (!isMissingFileError(error)) errors.push(error);
    }
  }
  return errors;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
