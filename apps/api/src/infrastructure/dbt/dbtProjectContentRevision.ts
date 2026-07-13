import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const EXCLUDED_DIRECTORY_NAMES = new Set([
  '.git',
  '.tox',
  '.venv',
  '__pycache__',
  'build',
  'dbt_packages',
  'dist',
  'logs',
  'target',
  'venv',
]);
const EXCLUDED_FILE_NAMES = new Set(['profiles.yml', 'profiles.yaml']);

export type ProjectContentRevision = Readonly<{
  sha256: string;
  files: number;
  bytes: number;
}>;

export async function hashProjectContent(
  projectDirectory: string,
  limits: { readonly maxFiles: number; readonly maxBytes: number }
): Promise<ProjectContentRevision> {
  const entries: Array<{ path: string; sha256: string; bytes: number }> = [];
  const state = { bytes: 0 };
  await visitProjectDirectory(projectDirectory, projectDirectory, entries, limits, state);
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
  limits: { readonly maxFiles: number; readonly maxBytes: number },
  state: { bytes: number }
): Promise<void> {
  const directoryEntries = await readdir(currentDirectory, { withFileTypes: true });
  for (const entry of directoryEntries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isSymbolicLink()) {
      throw new Error(`Symbolic links are not accepted in analyzed dbt projects: ${entry.name}`);
    }
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
        await visitProjectDirectory(
          projectDirectory,
          path.join(currentDirectory, entry.name),
          entries,
          limits,
          state
        );
      }
      continue;
    }
    if (!entry.isFile() || EXCLUDED_FILE_NAMES.has(entry.name)) continue;

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
