/** Owned concern: deterministic source and semantic identity; all original runner assertions remain in their cases. */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deriveDbtAnalysisSha256 } from '../../../src/infrastructure/dbt/dbtAnalysisIdentity.js';
import { DbtCliProjectAnalyzer } from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';

import {
  createDbtAnalyzerFixture,
  SCOPE,
  LEGACY_V1_ANALYSIS_SHA256,
  V2_ANALYSIS_SHA256,
  readFlag,
  manifest,
} from './DbtCliProjectAnalyzer.fixtures.js';

describe('DbtCliProjectAnalyzer deterministic source and semantic identity', () => {
  let workspaceFilesRoot: string;
  let profilesDirectory: string;
  let projectDirectory: string;
  let fixture: Awaited<ReturnType<typeof createDbtAnalyzerFixture>>;
  beforeEach(async () => {
    fixture = await createDbtAnalyzerFixture();
    ({ workspaceFilesRoot, profilesDirectory, projectDirectory } = fixture);
  });
  afterEach(async () => {
    await fixture.dispose();
  });

  it('returns deterministic hashes for unchanged project content and normalized analysis', async () => {
    const processRunner = {
      run: vi.fn().mockImplementation(async (input: { args: readonly string[] }) => {
        const targetPath = readFlag(input.args, '--target-path');
        await mkdir(targetPath, { recursive: true });
        await writeFile(path.join(targetPath, 'manifest.json'), JSON.stringify(manifest()), 'utf8');
        return { kind: 'completed' as const, exitCode: 0, stdout: '', stderr: '' };
      }),
    };
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner,
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const first = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });
    const second = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(second.projectRevision.contentSetSha256).toBe(first.projectRevision.contentSetSha256);
    expect(second.analysisSha256).toBe(first.analysisSha256);
    expect(first.analysisSha256).toBe(V2_ANALYSIS_SHA256);
    expect(first.analysisSha256).not.toBe(LEGACY_V1_ANALYSIS_SHA256);
    const readRevision = await analyzer.readSourceRevision({
      scope: SCOPE,
      projectRoot: 'analytics',
    });
    expect(readRevision).toBe(first.projectRevision.contentSetSha256);
    expect(processRunner.run).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['model', 'models/orders.sql', 'select 2 as order_id\n'],
    [
      'config',
      'dbt_project.yml',
      'name: analytics\nversion: 2.0.0\nprofile: analytics\nmodel-paths: [models]\n',
    ],
    ['installed dependency', 'dbt_packages/package/models/model.sql', 'select 3 as order_id\n'],
  ])(
    'changes the source revision when %s changes without invoking dbt',
    async (_label, relativePath, content) => {
      const run = vi.fn();
      const analyzer = new DbtCliProjectAnalyzer({ workspaceFilesRoot, processRunner: { run } });
      const input = { scope: SCOPE, projectRoot: 'analytics' };
      const before = await analyzer.readSourceRevision(input);
      await mkdir(path.dirname(path.join(projectDirectory, relativePath)), { recursive: true });
      await writeFile(path.join(projectDirectory, relativePath), content, 'utf8');
      await expect(analyzer.readSourceRevision(input)).resolves.not.toBe(before);
      expect(run).not.toHaveBeenCalled();
    }
  );

  it('does not change the source revision for generated runtime outputs', async () => {
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({ workspaceFilesRoot, processRunner: { run } });
    const input = { scope: SCOPE, projectRoot: 'analytics' };
    const before = await analyzer.readSourceRevision(input);
    await writeFile(
      path.join(projectDirectory, 'target/manifest.json'),
      '{"changed":true}',
      'utf8'
    );
    await mkdir(path.join(projectDirectory, 'logs'), { recursive: true });
    await writeFile(path.join(projectDirectory, 'logs/dbt.log'), 'changed', 'utf8');
    await expect(analyzer.readSourceRevision(input)).resolves.toBe(before);
    expect(run).not.toHaveBeenCalled();
  });

  it.each([
    { scope: { ...SCOPE, tenantId: 'other' }, projectRoot: 'analytics' },
    { scope: SCOPE, projectRoot: '../outside' },
  ])('refuses reading source outside the authorized existing project: %j', async (input) => {
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({ workspaceFilesRoot, processRunner: { run } });
    await expect(analyzer.readSourceRevision(input)).rejects.toThrow();
    expect(run).not.toHaveBeenCalled();
  });

  it.each([
    { maxProjectFiles: 1 },
    { maxProjectBytes: 1 },
    { maxProjectDirectories: 1 },
    { maxProjectDepth: 0 },
  ])(
    'enforces the configured snapshot traversal limits while reading revision: %j',
    async (limits) => {
      const run = vi.fn();
      const analyzer = new DbtCliProjectAnalyzer({
        workspaceFilesRoot,
        processRunner: { run },
        ...limits,
      });
      await expect(
        analyzer.readSourceRevision({ scope: SCOPE, projectRoot: 'analytics' })
      ).rejects.toThrow();
      expect(run).not.toHaveBeenCalled();
    }
  );

  it('changes analysis identity when semantic evidence changes', () => {
    const identityInput = {
      status: 'valid' as const,
      contentSetSha256: 'content-sha',
      analyzerVersion: 'dvt-dbt-analyzer.v2',
      resources: [],
      dependencies: [],
      diagnostics: [],
      semanticEvidence: {
        files: [],
        identities: [],
        regions: [],
        diagnostics: [],
      },
    };

    const baseline = deriveDbtAnalysisSha256(identityInput);
    const changed = deriveDbtAnalysisSha256({
      ...identityInput,
      semanticEvidence: {
        ...identityInput.semanticEvidence,
        regions: [
          {
            regionId: 'region-1',
            ownerUniqueIds: ['model.analytics.orders'],
            path: 'models/orders.sql',
            kind: 'source',
            range: { startByte: 14, endByte: 40 },
            sourceSha256: 'source-sha',
            classification: 'supported',
            targetUniqueId: 'source.analytics.raw.orders',
          },
        ],
      },
    });

    expect(deriveDbtAnalysisSha256(identityInput)).toBe(baseline);
    expect(changed).not.toBe(baseline);
  });
});
