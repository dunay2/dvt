import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hashProjectContent } from '../../../src/infrastructure/dbt/dbtProjectContentRevision.js';

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
});
