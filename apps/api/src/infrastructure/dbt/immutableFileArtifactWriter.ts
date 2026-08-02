/** Owned concern: create immutable file artifacts idempotently and reject content drift. */
import { mkdir, open, readFile, unlink, type FileHandle } from 'node:fs/promises';
import path from 'node:path';

export async function writeImmutableFileArtifact(
  artifactPath: string,
  bytes: Buffer,
  io: ImmutableFileArtifactIo = DEFAULT_IO
): Promise<void> {
  await io.mkdir(path.dirname(artifactPath), { recursive: true });
  let handle: FileHandle | null = null;
  try {
    handle = await io.open(artifactPath, 'wx');
    await writeAll(handle, bytes);
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      if (handle !== null) {
        await handle.close();
        handle = null;
        await removeCreatedArtifact(io, artifactPath, error);
      }
      throw error;
    }
    const existing = await io.readFile(artifactPath);
    if (!existing.equals(bytes)) {
      throw new Error('The immutable artifact already exists with different content.', {
        cause: error,
      });
    }
  } finally {
    await handle?.close();
  }
}

export interface ImmutableFileArtifactIo {
  readonly mkdir: typeof mkdir;
  readonly open: typeof open;
  readonly readFile: typeof readFile;
  readonly unlink: typeof unlink;
}

const DEFAULT_IO: ImmutableFileArtifactIo = { mkdir, open, readFile, unlink };

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

async function removeCreatedArtifact(
  io: ImmutableFileArtifactIo,
  artifactPath: string,
  writeError: unknown
): Promise<void> {
  try {
    await io.unlink(artifactPath);
  } catch (cleanupError) {
    if (isMissingFileError(cleanupError)) return;
    throw new AggregateError(
      [writeError, cleanupError],
      'Immutable artifact write failed and its incomplete file could not be removed.',
      { cause: cleanupError }
    );
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
