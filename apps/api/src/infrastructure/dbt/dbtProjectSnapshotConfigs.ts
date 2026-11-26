/** Read snapshot project configurations in deterministic directory order. */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

export async function* readDbtProjectSnapshotConfigs(directory: string): AsyncGenerator<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* readDbtProjectSnapshotConfigs(candidate);
    else if (entry.isFile() && entry.name === 'dbt_project.yml')
      yield await readFile(candidate, 'utf8');
  }
}
