import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { sha256HexUtf8 } from '@dvt/crypto';

import { buildSanitizedProcessEnvironment } from './dbtAnalyzerProcess.js';

export type DbtAnalysisContext = Readonly<{
  identity: string;
  profiles: readonly Readonly<{ name: string; contents: Buffer }>[];
  environment: NodeJS.ProcessEnv;
}>;

/** Private execution inputs; neither credential bytes nor their identity leave the adapter. */
export async function readDbtAnalysisContext(
  profilesDirectory: string,
  processEnvironment: NodeJS.ProcessEnv
): Promise<DbtAnalysisContext> {
  const profiles: { name: string; contents: Buffer }[] = [];
  for (const name of ['profiles.yml', 'profiles.yaml']) {
    try {
      profiles.push({ name, contents: await readFile(path.join(profilesDirectory, name)) });
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
  }
  if (profiles.length === 0) throw new Error('Managed dbt profiles are unavailable.');
  const environment = buildSanitizedProcessEnvironment(processEnvironment, '<isolated-home>');
  const identity = sha256HexUtf8(
    JSON.stringify({
      profiles: profiles.map(({ name, contents }) => [name, contents.toString('base64')]),
      environment: Object.entries(environment).sort(([a], [b]) => a.localeCompare(b)),
    })
  );
  return { identity, profiles, environment };
}

/** Execute the bytes used in the reuse identity, independent of concurrent profile edits. */
export async function writeDbtProfilesSnapshot(
  analysisRoot: string,
  context: DbtAnalysisContext
): Promise<string> {
  const directory = path.join(analysisRoot, 'profiles');
  await mkdir(directory, { mode: 0o700 });
  await Promise.all(
    context.profiles.map(({ name, contents }) =>
      writeFile(path.join(directory, name), contents, { mode: 0o600, flag: 'wx' })
    )
  );
  return directory;
}
