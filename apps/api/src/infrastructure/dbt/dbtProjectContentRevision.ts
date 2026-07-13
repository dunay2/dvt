import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
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
  await visitProjectDirectory(projectDirectory, projectDirectory, entries, limits);
  entries.sort((left, right) => left.path.localeCompare(right.path));
  return {
    sha256: createHash('sha256').update(stableJson(entries), 'utf8').digest('hex'),
    files: entries.length,
    bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
  };
}

async function visitProjectDirectory(
  projectDirectory: string,
  currentDirectory: string,
  entries: Array<{ path: string; sha256: string; bytes: number }>,
  limits: { readonly maxFiles: number; readonly maxBytes: number }
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
          limits
        );
      }
      continue;
    }
    if (!entry.isFile() || EXCLUDED_FILE_NAMES.has(entry.name)) continue;

    const absolutePath = path.join(currentDirectory, entry.name);
    const content = await readFile(absolutePath);
    const nextBytes = entries.reduce((total, item) => total + item.bytes, 0) + content.byteLength;
    if (entries.length + 1 > limits.maxFiles || nextBytes > limits.maxBytes) {
      throw new Error('The dbt project exceeds configured analysis limits.');
    }
    entries.push({
      path: path.relative(projectDirectory, absolutePath).replaceAll('\\', '/'),
      sha256: createHash('sha256').update(content).digest('hex'),
      bytes: content.byteLength,
    });
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}
