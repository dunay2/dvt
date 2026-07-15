import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  hashProjectContent,
  snapshotProjectContent,
} from '../../../src/infrastructure/dbt/dbtProjectContentRevision.js';

const DEFAULT_LIMITS = {
  maxFiles: 100,
  maxBytes: 10_000,
  maxDirectories: 100,
  maxDepth: 10,
} as const;

describe('hashProjectContent', () => {
  let projectDirectory: string;

  beforeEach(async () => {
    projectDirectory = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-project-content-'));
    await writeFile(path.join(projectDirectory, 'dbt_project.yml'), 'name: analytics\n', 'utf8');
  });

  afterEach(async () => {
    await rm(projectDirectory, { recursive: true, force: true });
  });

  it('counts generated-name directories in the byte budget', async () => {
    const configuredResourceDirectory = path.join(projectDirectory, 'target');
    await mkdir(configuredResourceDirectory);
    await writeFile(
      path.join(configuredResourceDirectory, 'project-controlled.sql'),
      'x'.repeat(4_096),
      'utf8'
    );

    await expect(
      hashProjectContent(projectDirectory, { ...DEFAULT_LIMITS, maxBytes: 1_000 })
    ).rejects.toThrow('The dbt project exceeds configured analysis limits.');
  });

  it('rejects directory-count overflow before descending further', async () => {
    await Promise.all(
      ['one', 'two', 'three'].map((name) =>
        mkdir(path.join(projectDirectory, 'empty', name), { recursive: true })
      )
    );

    await expect(
      hashProjectContent(projectDirectory, { ...DEFAULT_LIMITS, maxDirectories: 3 })
    ).rejects.toThrow('The dbt project exceeds configured analysis limits.');
  });

  it('rejects directory-depth overflow before descending further', async () => {
    await mkdir(path.join(projectDirectory, 'one', 'two', 'three'), { recursive: true });

    await expect(
      hashProjectContent(projectDirectory, { ...DEFAULT_LIMITS, maxDepth: 2 })
    ).rejects.toThrow('The dbt project exceeds configured analysis limits.');
  });

  it('copies exactly the bytes represented by the returned revision', async () => {
    const snapshotDirectory = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-project-snapshot-'));
    await mkdir(path.join(projectDirectory, 'models'));
    await writeFile(path.join(projectDirectory, 'models', 'orders.sql'), 'select 1\n', 'utf8');

    try {
      const revision = await snapshotProjectContent(
        projectDirectory,
        snapshotDirectory,
        DEFAULT_LIMITS
      );
      const snapshotRevision = await hashProjectContent(snapshotDirectory, DEFAULT_LIMITS);

      expect(snapshotRevision).toEqual(revision);
      await expect(
        readFile(path.join(snapshotDirectory, 'models', 'orders.sql'), 'utf8')
      ).resolves.toBe('select 1\n');
    } finally {
      await rm(snapshotDirectory, { recursive: true, force: true });
    }
  });

  it('excludes only configured runtime directories from snapshots and revisions', async () => {
    const snapshotDirectory = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-project-snapshot-'));
    await mkdir(path.join(projectDirectory, 'models', 'target'), { recursive: true });
    await mkdir(path.join(projectDirectory, 'generated', 'target'), { recursive: true });
    await writeFile(path.join(projectDirectory, 'models', 'target', 'model.sql'), 'select 1\n');
    await writeFile(path.join(projectDirectory, 'generated', 'target', 'manifest.json'), '{}');

    try {
      const selection = { excludedDirectoryPaths: ['generated/target'] } as const;
      const revision = await snapshotProjectContent(
        projectDirectory,
        snapshotDirectory,
        DEFAULT_LIMITS,
        selection
      );
      const expectedRevision = await hashProjectContent(
        projectDirectory,
        DEFAULT_LIMITS,
        selection
      );

      expect(revision).toEqual(expectedRevision);
      await expect(
        readFile(path.join(snapshotDirectory, 'models', 'target', 'model.sql'), 'utf8')
      ).resolves.toBe('select 1\n');
      await expect(
        readFile(path.join(snapshotDirectory, 'generated', 'target', 'manifest.json'), 'utf8')
      ).rejects.toThrow();
    } finally {
      await rm(snapshotDirectory, { recursive: true, force: true });
    }
  });
});
