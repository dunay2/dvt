import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DbtProjectAnalysis,
  DbtProjectAnalysisFile,
} from '../../../src/application/ports/dbtProjectAnalysis.js';
import type { DbtProcessRunner } from '../../../src/infrastructure/dbt/dbtAnalyzerProcess.js';
import {
  DbtCliProjectAnalyzer,
  type DbtCliProjectAnalyzerOptions,
} from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';
import { DbtCliProjectCandidateAnalyzer } from '../../../src/infrastructure/dbt/DbtCliProjectCandidateAnalyzer.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'env-a',
} as const;

describe('DbtCliProjectCandidateAnalyzer', () => {
  let workspaceFilesRoot: string;
  let profilesDirectory: string;
  let projectDirectory: string;
  let runner: DbtProcessRunner;
  let run: ReturnType<typeof vi.fn<DbtProcessRunner['run']>>;

  beforeEach(async () => {
    workspaceFilesRoot = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-candidate-workspace-'));
    profilesDirectory = await mkdtemp(path.join(tmpdir(), 'dvt-dbt-candidate-profiles-'));
    projectDirectory = path.join(
      resolveWorkspaceScopeStorageRoot(workspaceFilesRoot, SCOPE),
      'analytics'
    );
    await mkdir(path.join(projectDirectory, 'models'), { recursive: true });
    await writeFile(
      path.join(projectDirectory, 'dbt_project.yml'),
      'name: analytics\nversion: 1.0.0\nprofile: analytics\nmodel-paths: [models]\n',
      'utf8'
    );
    await writeFile(
      path.join(profilesDirectory, 'profiles.yml'),
      'analytics:\n  target: analysis\n  outputs:\n    analysis:\n      type: postgres\n',
      'utf8'
    );
    await writeFile(
      path.join(projectDirectory, 'models', 'orders.sql'),
      "-- retained\nselect * from {{ source('raw', 'orders') }}\n",
      'utf8'
    );
    await writeFile(
      path.join(projectDirectory, 'models', 'sources.yml'),
      'version: 2\nsources:\n  - name: raw\n    tables:\n      - name: orders\n      - name: customers\n',
      'utf8'
    );
    run = vi.fn<DbtProcessRunner['run']>(async (input) => {
      const projectPath = readFlag(input.args, '--project-dir');
      const sql = await readFile(path.join(projectPath, 'models', 'orders.sql'), 'utf8');
      const sources = await readFile(path.join(projectPath, 'models', 'sources.yml'), 'utf8');
      expect(sources).toBe(
        'version: 2\nsources:\n  - name: raw\n    tables:\n      - name: orders\n      - name: customers\n'
      );
      const targetPath = readFlag(input.args, '--target-path');
      await mkdir(targetPath, { recursive: true });
      await writeFile(
        path.join(targetPath, 'manifest.json'),
        JSON.stringify(manifest(sql.includes("'customers'") ? 'customers' : 'orders')),
        'utf8'
      );
      return { kind: 'completed', exitCode: 0, stdout: '', stderr: '' };
    });
    runner = { run };
  });

  afterEach(async () => {
    await Promise.all([
      rm(workspaceFilesRoot, { recursive: true, force: true }),
      rm(profilesDirectory, { recursive: true, force: true }),
    ]);
  });

  it('parses an isolated candidate while preserving every unrelated project file', async () => {
    const current = await analyzeCurrent();
    run.mockClear();
    const target = file(current, 'models/orders.sql');

    const result = await candidateAnalyzer().analyzeCandidate({
      scope: SCOPE,
      projectRoot: 'analytics',
      expectedContentSetSha256: current.projectRevision.contentSetSha256,
      expectedFiles: current.semanticEvidence.files,
      candidate: {
        path: target.path,
        expectedContentSha256: target.revisionSha256,
        content: "-- retained\nselect * from {{ source('raw', 'customers') }}\n",
      },
    });

    expect(result.kind).toBe('analyzed');
    if (result.kind !== 'analyzed') return;
    expect(result.analysis.status).toBe('valid');
    expect(result.analysis.semanticEvidence.regions).toEqual([
      expect.objectContaining({
        classification: 'supported',
        targetUniqueId: 'source.analytics.raw.customers',
      }),
    ]);
    expect(run).toHaveBeenCalledTimes(1);
    await expect(readFile(path.join(projectDirectory, target.path), 'utf8')).resolves.toContain(
      "source('raw', 'orders')"
    );
  });

  it('refuses stale project evidence before invoking dbt', async () => {
    const current = await analyzeCurrent();
    const target = file(current, 'models/orders.sql');
    await writeFile(
      path.join(projectDirectory, 'models', 'sources.yml'),
      'version: 2\nsources: []\n',
      'utf8'
    );
    run.mockClear();

    const result = await candidateAnalyzer().analyzeCandidate({
      scope: SCOPE,
      projectRoot: 'analytics',
      expectedContentSetSha256: current.projectRevision.contentSetSha256,
      expectedFiles: current.semanticEvidence.files,
      candidate: {
        path: target.path,
        expectedContentSha256: target.revisionSha256,
        content: "select * from {{ source('raw', 'customers') }}\n",
      },
    });

    expect(result).toEqual({
      kind: 'conflict',
      reason: 'project_revision_changed',
      changedPaths: ['models/sources.yml'],
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('reports a removed project as stale evidence without invoking dbt', async () => {
    const current = await analyzeCurrent();
    const target = file(current, 'models/orders.sql');
    await rm(projectDirectory, { recursive: true, force: true });
    run.mockClear();

    const result = await candidateAnalyzer().analyzeCandidate({
      scope: SCOPE,
      projectRoot: 'analytics',
      expectedContentSetSha256: current.projectRevision.contentSetSha256,
      expectedFiles: current.semanticEvidence.files,
      candidate: {
        path: target.path,
        expectedContentSha256: target.revisionSha256,
        content: "select * from {{ source('raw', 'customers') }}\n",
      },
    });

    expect(result).toEqual({
      kind: 'conflict',
      reason: 'project_revision_changed',
      changedPaths: ['.'],
    });
    expect(run).not.toHaveBeenCalled();
  });

  async function analyzeCurrent(): Promise<DbtProjectAnalysis> {
    return new DbtCliProjectAnalyzer(options()).analyze({
      scope: SCOPE,
      projectRoot: 'analytics',
    });
  }

  function candidateAnalyzer(): DbtCliProjectCandidateAnalyzer {
    return new DbtCliProjectCandidateAnalyzer(options());
  }

  function options(): DbtCliProjectAnalyzerOptions {
    return {
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: runner,
      now: () => new Date('2026-08-01T10:00:00.000Z'),
    };
  }
});

function file(analysis: DbtProjectAnalysis, pathName: string): DbtProjectAnalysisFile {
  const value = analysis.semanticEvidence.files.find((entry) => entry.path === pathName);
  if (value === undefined) throw new Error(`Missing analysis file ${pathName}`);
  return value;
}

function readFlag(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  const value = args[index + 1];
  if (index < 0 || value === undefined) throw new Error(`Missing ${flag}`);
  return value;
}

function manifest(sourceTable: 'orders' | 'customers'): Record<string, unknown> {
  const sourceUniqueId = `source.analytics.raw.${sourceTable}`;
  return {
    metadata: { dbt_version: '1.10.0', project_name: 'analytics' },
    nodes: {
      'model.analytics.orders': {
        unique_id: 'model.analytics.orders',
        resource_type: 'model',
        name: 'orders',
        package_name: 'analytics',
        original_file_path: 'models/orders.sql',
        depends_on: { nodes: [sourceUniqueId] },
        config: { materialized: 'table' },
        columns: {},
        tags: [],
      },
    },
    sources: Object.fromEntries(
      ['orders', 'customers'].map((name) => [
        `source.analytics.raw.${name}`,
        {
          unique_id: `source.analytics.raw.${name}`,
          resource_type: 'source',
          name,
          source_name: 'raw',
          package_name: 'analytics',
          original_file_path: 'models/sources.yml',
          depends_on: { nodes: [] },
          columns: {},
          tags: [],
        },
      ])
    ),
    exposures: {},
    metrics: {},
  };
}
