/** Owned concern: create immutable file artifacts idempotently and reject content drift. */
import { mkdir, open, readFile, type FileHandle } from 'node:fs/promises';
import path from 'node:path';

export async function writeImmutableFileArtifact(
  artifactPath: string,
  bytes: Buffer
): Promise<void> {
  await mkdir(path.dirname(artifactPath), { recursive: true });
  let handle: FileHandle | null = null;
  try {
    handle = await open(artifactPath, 'wx');
    await writeAll(handle, bytes);
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
    const existing = await readFile(artifactPath);
    if (!existing.equals(bytes)) {
      throw new Error('The immutable artifact already exists with different content.', {
        cause: error,
      });
    }
  } finally {
    await handle?.close();
  }
}

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
