import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DBT_GENERATED_ARTIFACT_DIRECTORY_DEFAULTS,
  DBT_INSTALLED_DEPENDENCY_DIRECTORY_DEFAULTS,
  evaluateDbtProjectPathPolicy,
  evaluateDbtProjectSnapshotPathPolicy,
  resolveDbtProjectDirectoryPartition,
} from '../../../src/infrastructure/dbt/dbtProjectPathPolicy.js';

describe('dbtProjectPathPolicy', () => {
  it.each([
    ['parent traversal', 'model-paths: [../models]\n', 'escaping_path'],
    ['POSIX absolute path', 'macro-paths: [/srv/dbt/macros]\n', 'escaping_path'],
    ['Windows absolute path', "seed-paths: ['C:\\\\warehouse\\\\seeds']\n", 'escaping_path'],
    ['Windows drive-relative path', "model-paths: ['C:models']\n", 'escaping_path'],
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

  it('partitions generated artifacts from installed parse dependencies', () => {
    expect(
      resolveDbtProjectDirectoryPartition(`
name: analytics
target-path: build/../generated/target
log-path: generated/logs
packages-install-path: vendor/dbt
`)
    ).toEqual({
      generatedArtifactDirectories: ['generated/logs', 'generated/target'],
      installedDependencyDirectories: ['vendor/dbt'],
      sourceDirectories: [
        'analyses',
        'macros',
        'models',
        'seeds',
        'semantic_models',
        'snapshots',
        'tests',
      ],
    });
  });

  it('canonicalizes trailing separators in configured non-source directories', () => {
    expect(
      resolveDbtProjectDirectoryPartition(`
name: analytics
target-path: target/
log-path: logs/
packages-install-path: dbt_packages/
`)
    ).toEqual({
      generatedArtifactDirectories: ['logs', 'target'],
      installedDependencyDirectories: ['dbt_packages'],
      sourceDirectories: [
        'analyses',
        'macros',
        'models',
        'seeds',
        'semantic_models',
        'snapshots',
        'tests',
      ],
    });
  });

  it('uses canonical directory defaults when no override is configured', () => {
    expect(resolveDbtProjectDirectoryPartition('name: analytics\n')).toEqual({
      generatedArtifactDirectories: [...DBT_GENERATED_ARTIFACT_DIRECTORY_DEFAULTS].sort(
        (left, right) => left.localeCompare(right)
      ),
      installedDependencyDirectories: [...DBT_INSTALLED_DEPENDENCY_DIRECTORY_DEFAULTS].sort(
        (left, right) => left.localeCompare(right)
      ),
      sourceDirectories: [
        'analyses',
        'macros',
        'models',
        'seeds',
        'semantic_models',
        'snapshots',
        'tests',
      ],
    });
  });

  it('exposes normalized configured source directories for canonical snapshots', () => {
    expect(
      resolveDbtProjectDirectoryPartition(`
name: analytics
model-paths: [warehouse/models, shared/../shared_models]
seed-paths: [warehouse/seeds]
`)
    ).toMatchObject({
      sourceDirectories: [
        'analyses',
        'macros',
        'semantic_models',
        'shared_models',
        'snapshots',
        'tests',
        'warehouse/models',
        'warehouse/seeds',
      ],
    });
  });

  it('rejects a non-source path that would hide configured project source', () => {
    expect(
      evaluateDbtProjectPathPolicy(`
name: analytics
model-paths: [models]
target-path: models
`)
    ).toEqual({ ok: false, reason: 'non_source_path_shadows_source' });
  });

  it.each([
    ['the project root', 'target-path: .\n'],
    ['a default source path', 'target-path: models\n'],
  ])('rejects a non-source path that shadows %s', (_label, setting) => {
    expect(evaluateDbtProjectPathPolicy(`name: analytics\n${setting}`)).toEqual({
      ok: false,
      reason: 'non_source_path_shadows_source',
    });
  });

  it('rejects overlapping generated-artifact and installed-dependency directories', () => {
    expect(
      evaluateDbtProjectPathPolicy(`
name: analytics
target-path: vendor
packages-install-path: vendor/dbt
`)
    ).toEqual({ ok: false, reason: 'non_source_path_overlap' });
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
