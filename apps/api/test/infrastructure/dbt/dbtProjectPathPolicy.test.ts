import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  evaluateDbtProjectPathPolicy,
  evaluateDbtProjectSnapshotPathPolicy,
} from '../../../src/infrastructure/dbt/dbtProjectPathPolicy.js';

describe('dbtProjectPathPolicy', () => {
  it.each([
    ['parent traversal', 'model-paths: [../models]\n', 'escaping_path'],
    ['POSIX absolute path', 'macro-paths: [/srv/dbt/macros]\n', 'escaping_path'],
    ['Windows absolute path', "seed-paths: ['C:\\\\warehouse\\\\seeds']\n", 'escaping_path'],
    [
      'templated path',
      'snapshot-paths: ["{{ env_var(\'SNAPSHOT_ROOT\') }}"]\n',
      'unverifiable_path',
    ],
    ['non-string path', 'analysis-paths: [analyses, 42]\n', 'unsupported_path_value'],
    ['malformed project YAML', 'model-paths: [models\n', 'malformed_config'],
  ])('rejects %s', (_label, content, reason) => {
    expect(evaluateDbtProjectPathPolicy(content)).toEqual({ ok: false, reason });
  });

  it('accepts relative paths that normalize inside the project snapshot', () => {
    expect(
      evaluateDbtProjectPathPolicy(`
name: analytics
model-paths: [models, models/../shared]
packages-install-path: dbt_packages
semantic-model-paths: [semantic_models]
vars:
  custom-path: ../not-a-dbt-path-setting
`)
    ).toEqual({ ok: true });
  });

  it('rejects an escaping path declared by a vendored dbt package', async () => {
    const snapshotDirectory = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-path-policy-'));
    try {
      const packageDirectory = path.join(snapshotDirectory, 'dbt_packages', 'unsafe_package');
      await mkdir(packageDirectory, { recursive: true });
      await Promise.all([
        writeFile(
          path.join(snapshotDirectory, 'dbt_project.yml'),
          'name: root\nmodel-paths: [models]\n',
          'utf8'
        ),
        writeFile(
          path.join(packageDirectory, 'dbt_project.yml'),
          'name: unsafe_package\nmacro-paths: [/host/macros]\n',
          'utf8'
        ),
      ]);

      await expect(evaluateDbtProjectSnapshotPathPolicy(snapshotDirectory)).resolves.toEqual({
        ok: false,
        reason: 'escaping_path',
      });
    } finally {
      await rm(snapshotDirectory, { recursive: true, force: true });
    }
  });
});
