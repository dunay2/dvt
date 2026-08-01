import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { hashProjectContent } from '../../../src/infrastructure/dbt/dbtProjectContentRevision.js';
import {
  hashDbtProjectSource,
  snapshotDbtProjectSource,
} from '../../../src/infrastructure/dbt/dbtProjectSourceSnapshot.js';

const LIMITS = {
  maxFiles: 100,
  maxBytes: 100_000,
  maxDirectories: 100,
  maxDepth: 12,
} as const;
const roots: string[] = [];

describe('snapshotDbtProjectSource', () => {
  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it('copies exactly the executable source set and excludes credentials and runtime artifacts', async () => {
    const project = await makeRoot('dvt-dbt-source-project-');
    const snapshot = await makeRoot('dvt-dbt-source-snapshot-');
    await writeProject(project);

    const revision = await snapshotDbtProjectSource({
      projectDirectory: project,
      snapshotDirectory: snapshot,
      limits: LIMITS,
    });

    await expect(
      readFile(path.join(snapshot, 'warehouse', 'models', 'orders.sql'), 'utf8')
    ).resolves.toBe('select 1 as id\n');
    await expect(
      readFile(path.join(snapshot, 'dbt_packages', 'calendar', 'macros', 'date.sql'), 'utf8')
    ).resolves.toBe('{% macro date_key() %}1{% endmacro %}\n');
    await expect(readFile(path.join(snapshot, 'profiles.yml'), 'utf8')).rejects.toThrow();
    await expect(readFile(path.join(snapshot, '.env.production'), 'utf8')).rejects.toThrow();
    await expect(
      readFile(path.join(snapshot, 'generated', 'manifest.json'), 'utf8')
    ).rejects.toThrow();
    await expect(readFile(path.join(snapshot, '.git', 'config'), 'utf8')).rejects.toThrow();
    await expect(
      readFile(path.join(snapshot, 'warehouse', 'models', 'notes.txt'), 'utf8')
    ).rejects.toThrow();

    await expect(hashProjectContent(snapshot, LIMITS)).resolves.toEqual(revision);
    await expect(
      hashDbtProjectSource({ projectDirectory: project, limits: LIMITS })
    ).resolves.toEqual(revision);
  });
});

async function makeRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

async function writeProject(project: string): Promise<void> {
  await Promise.all([
    mkdir(path.join(project, 'warehouse', 'models'), { recursive: true }),
    mkdir(path.join(project, 'dbt_packages', 'calendar', 'macros'), { recursive: true }),
    mkdir(path.join(project, 'generated'), { recursive: true }),
    mkdir(path.join(project, '.git'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(project, 'dbt_project.yml'),
      [
        'name: analytics',
        'model-paths: [warehouse/models]',
        'target-path: generated',
        'packages-install-path: dbt_packages',
        '',
      ].join('\n')
    ),
    writeFile(path.join(project, 'warehouse', 'models', 'orders.sql'), 'select 1 as id\n'),
    writeFile(path.join(project, 'warehouse', 'models', 'notes.txt'), 'not executable\n'),
    writeFile(
      path.join(project, 'dbt_packages', 'calendar', 'dbt_project.yml'),
      'name: calendar\n'
    ),
    writeFile(
      path.join(project, 'dbt_packages', 'calendar', 'macros', 'date.sql'),
      '{% macro date_key() %}1{% endmacro %}\n'
    ),
    writeFile(path.join(project, 'profiles.yml'), 'password: secret\n'),
    writeFile(path.join(project, '.env.production'), 'TOKEN=secret\n'),
    writeFile(path.join(project, 'generated', 'manifest.json'), '{"secret":"runtime"}\n'),
    writeFile(path.join(project, '.git', 'config'), 'credential = secret\n'),
  ]);
}
