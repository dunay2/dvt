/** Owned concern: isolated native parse; all original runner assertions remain in their cases. */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DbtCliProjectAnalyzer } from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';

import {
  createDbtAnalyzerFixture,
  SCOPE,
  readFlag,
  manifest,
} from './DbtCliProjectAnalyzer.fixtures.js';

describe('DbtCliProjectAnalyzer isolated native parse', () => {
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

  it('runs dbt parse in isolated target/log paths and ignores stale project artifacts', async () => {
    let isolatedProjectDirectory = '';
    let isolatedTargetPath = '';
    let isolatedLogPath = '';
    let isolatedProfilesDirectory = '';
    const run = vi.fn().mockImplementation(async (input: { args: readonly string[] }) => {
      isolatedProjectDirectory = readFlag(input.args, '--project-dir');
      isolatedTargetPath = readFlag(input.args, '--target-path');
      isolatedLogPath = readFlag(input.args, '--log-path');
      isolatedProfilesDirectory = readFlag(input.args, '--profiles-dir');
      await expect(
        readFile(path.join(isolatedProfilesDirectory, 'profiles.yml'), 'utf8')
      ).resolves.toBe(await readFile(path.join(profilesDirectory, 'profiles.yml'), 'utf8'));
      await mkdir(isolatedTargetPath, { recursive: true });
      await writeFile(
        path.join(isolatedTargetPath, 'manifest.json'),
        JSON.stringify(manifest()),
        'utf8'
      );
      return { kind: 'completed' as const, exitCode: 0, stdout: '', stderr: '' };
    });
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
      processEnvironment: {
        PATH: process.env.PATH,
        DATABASE_URL: 'must-not-leak',
        SNOWFLAKE_PASSWORD: 'must-not-leak',
      },
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('valid');
    expect(result.resources.map((resource) => resource.uniqueId)).toEqual([
      'model.analytics.orders',
      'source.analytics.raw.orders',
      'test.analytics.not_null_orders_order_id',
    ]);
    expect(result.resources.map((resource) => resource.uniqueId)).not.toContain(
      'model.analytics.stale'
    );
    expect(result.dependencies).toEqual([
      {
        sourceUniqueId: 'model.analytics.orders',
        targetUniqueId: 'test.analytics.not_null_orders_order_id',
        relation: 'test_target',
      },
      {
        sourceUniqueId: 'source.analytics.raw.orders',
        targetUniqueId: 'model.analytics.orders',
        relation: 'dependency',
      },
    ]);
    expect(result.semanticEvidence.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'dbt_project.yml',
          kind: 'project_config',
          byteLength: expect.any(Number),
          revisionSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        }),
        expect.objectContaining({
          path: 'models/orders.sql',
          kind: 'model',
        }),
      ])
    );
    expect(result.semanticEvidence.identities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ uniqueId: 'model.analytics.orders' }),
        expect.objectContaining({ uniqueId: 'source.analytics.raw.orders' }),
      ])
    );
    expect(result.semanticEvidence.regions).toEqual([
      expect.objectContaining({
        path: 'models/orders.sql',
        kind: 'source',
        classification: 'supported',
        targetUniqueId: 'source.analytics.raw.orders',
      }),
    ]);
    expect(result.semanticEvidence.diagnostics).toEqual([]);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        executable: 'dbt',
        cwd: isolatedProjectDirectory,
        args: expect.arrayContaining([
          'parse',
          '--no-partial-parse',
          '--project-dir',
          isolatedProjectDirectory,
          '--profiles-dir',
          isolatedProfilesDirectory,
        ]),
        env: expect.not.objectContaining({
          DATABASE_URL: expect.anything(),
          SNOWFLAKE_PASSWORD: expect.anything(),
        }),
      })
    );
    expect(path.relative(projectDirectory, isolatedTargetPath)).toMatch(/^\.\./);
    expect(path.relative(projectDirectory, isolatedLogPath)).toMatch(/^\.\./);
    expect(path.relative(projectDirectory, isolatedProjectDirectory)).toMatch(/^\.\./);
    expect(isolatedProfilesDirectory).not.toBe(profilesDirectory);
    expect(path.dirname(isolatedProfilesDirectory)).toBe(path.dirname(isolatedProjectDirectory));
    await expect(stat(path.join(isolatedProjectDirectory, 'target'))).rejects.toThrow();
    await expect(stat(isolatedTargetPath)).rejects.toThrow();
    await expect(stat(isolatedProjectDirectory)).rejects.toThrow();
    await expect(stat(isolatedProfilesDirectory)).rejects.toThrow();
  });
});
