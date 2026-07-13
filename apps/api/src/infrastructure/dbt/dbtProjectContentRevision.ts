import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

export type ProjectContentRevision = Readonly<{
  sha256: string;
  files: number;
  bytes: number;
}>;

export async function hashProjectContent(
  projectDirectory: string,
  limits: {
    readonly maxFiles: number;
    readonly maxBytes: number;
    readonly maxDirectories: number;
    readonly maxDepth: number;
  }
): Promise<ProjectContentRevision> {
  const entries: Array<{ path: string; sha256: string; bytes: number }> = [];
  const state = { bytes: 0, directories: 1 };
  if (state.directories > limits.maxDirectories || limits.maxDepth < 0) {
    throw new Error('The dbt project exceeds configured analysis limits.');
  }
  await visitProjectDirectory(projectDirectory, projectDirectory, entries, limits, state, 0);
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
  entries: Array<{ path: string; sha256: string; bytes: number }>,
  limits: {
    readonly maxFiles: number;
    readonly maxBytes: number;
    readonly maxDirectories: number;
    readonly maxDepth: number;
  },
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
      await visitProjectDirectory(
        projectDirectory,
        path.join(currentDirectory, entry.name),
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
    for await (const chunk of createReadStream(absolutePath)) {
      const contentChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      contentBytes += contentChunk.byteLength;
      if (contentBytes > remainingBytes) {
        throw new Error('The dbt project exceeds configured analysis limits.');
      }
      contentHash.update(contentChunk);
    }

    entries.push({
      path: path.relative(projectDirectory, absolutePath).replaceAll('\\', '/'),
      sha256: contentHash.digest('hex'),
      bytes: contentBytes,
    });
    state.bytes += contentBytes;
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}
