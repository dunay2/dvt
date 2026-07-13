import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readdir, stat, type FileHandle } from 'node:fs/promises';
import path from 'node:path';

export type ProjectContentRevision = Readonly<{
  sha256: string;
  files: number;
  bytes: number;
}>;

type ProjectContentLimits = Readonly<{
  maxFiles: number;
  maxBytes: number;
  maxDirectories: number;
  maxDepth: number;
}>;

export async function hashProjectContent(
  projectDirectory: string,
  limits: ProjectContentLimits
): Promise<ProjectContentRevision> {
  return collectProjectContent(projectDirectory, null, limits);
}

export async function snapshotProjectContent(
  projectDirectory: string,
  snapshotDirectory: string,
  limits: ProjectContentLimits
): Promise<ProjectContentRevision> {
  await mkdir(snapshotDirectory, { recursive: true });
  return collectProjectContent(projectDirectory, snapshotDirectory, limits);
}

async function collectProjectContent(
  projectDirectory: string,
  snapshotDirectory: string | null,
  limits: ProjectContentLimits
): Promise<ProjectContentRevision> {
  const entries: Array<{ path: string; sha256: string; bytes: number }> = [];
  const state = { bytes: 0, directories: 1 };
  if (state.directories > limits.maxDirectories || limits.maxDepth < 0) {
    throw new Error('The dbt project exceeds configured analysis limits.');
  }
  await visitProjectDirectory(
    projectDirectory,
    projectDirectory,
    snapshotDirectory,
    entries,
    limits,
    state,
    0
  );
  entries.sort((left, right) => left.path.localeCompare(right.path));
  return {
    sha256: createHash('sha256').update(stableJson(entries), 'utf8').digest('hex'),
    files: entries.length,
    bytes: state.bytes,
  };
}

async function visitProjectDirectory(
  projectDirectory: string,
  currentDirectory: string,
  currentSnapshotDirectory: string | null,
  entries: Array<{ path: string; sha256: string; bytes: number }>,
  limits: ProjectContentLimits,
  state: { bytes: number; directories: number },
  depth: number
): Promise<void> {
  const directoryEntries = await readdir(currentDirectory, { withFileTypes: true });
  for (const entry of directoryEntries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are not accepted in analyzed dbt projects: ${entry.name}`);
    }
    if (entry.isDirectory()) {
      const nextDepth = depth + 1;
      state.directories += 1;
      if (state.directories > limits.maxDirectories || nextDepth > limits.maxDepth) {
        throw new Error('The dbt project exceeds configured analysis limits.');
      }
      const nextSnapshotDirectory =
        currentSnapshotDirectory === null ? null : path.join(currentSnapshotDirectory, entry.name);
      if (nextSnapshotDirectory !== null) {
        await mkdir(nextSnapshotDirectory);
      }
      await visitProjectDirectory(
        projectDirectory,
        path.join(currentDirectory, entry.name),
        nextSnapshotDirectory,
        entries,
        limits,
        state,
        nextDepth
      );
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`Unsupported file-system entry in analyzed dbt project: ${entry.name}`);
    }

    const absolutePath = path.join(currentDirectory, entry.name);
    if (entries.length + 1 > limits.maxFiles) {
      throw new Error('The dbt project exceeds configured analysis limits.');
    }

    const remainingBytes = limits.maxBytes - state.bytes;
    const fileState = await stat(absolutePath);
    if (!fileState.isFile() || fileState.size > remainingBytes) {
      throw new Error('The dbt project exceeds configured analysis limits.');
    }

    const contentHash = createHash('sha256');
    let contentBytes = 0;
    const snapshotHandle =
      currentSnapshotDirectory === null
        ? null
        : await open(path.join(currentSnapshotDirectory, entry.name), 'wx');
    try {
      for await (const chunk of createReadStream(absolutePath)) {
        const contentChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        contentBytes += contentChunk.byteLength;
        if (contentBytes > remainingBytes) {
          throw new Error('The dbt project exceeds configured analysis limits.');
        }
        contentHash.update(contentChunk);
        if (snapshotHandle !== null) {
          await writeAll(snapshotHandle, contentChunk);
        }
      }
    } finally {
      await snapshotHandle?.close();
    }

    entries.push({
      path: path.relative(projectDirectory, absolutePath).replaceAll('\\', '/'),
      sha256: contentHash.digest('hex'),
      bytes: contentBytes,
    });
    state.bytes += contentBytes;
  }
}

async function writeAll(handle: FileHandle, content: Buffer): Promise<void> {
  let offset = 0;
  while (offset < content.byteLength) {
    const { bytesWritten } = await handle.write(content, offset, content.byteLength - offset, null);
    if (bytesWritten === 0) {
      throw new Error('The dbt project snapshot could not be written safely.');
    }
    offset += bytesWritten;
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}
