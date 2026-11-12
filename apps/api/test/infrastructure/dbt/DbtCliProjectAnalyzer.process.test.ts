/** Owned concern: native process and profile boundary; all original runner assertions remain in their cases. */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DbtCliProjectAnalyzer } from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';

import {
  createDbtAnalyzerFixture,
  SCOPE,
  readFlag,
  manifest,
} from './DbtCliProjectAnalyzer.fixtures.js';

describe('DbtCliProjectAnalyzer native process and profile boundary', () => {
  let workspaceFilesRoot: string;
  let profilesDirectory: string;
  let fixture: Awaited<ReturnType<typeof createDbtAnalyzerFixture>>;
  beforeEach(async () => {
    fixture = await createDbtAnalyzerFixture();
    ({ workspaceFilesRoot, profilesDirectory } = fixture);
  });
  afterEach(async () => {
    await fixture.dispose();
  });

  it('runs selected model compilation through the same isolated DBT boundary', async () => {
    const run = vi.fn().mockImplementation(async (input: { args: readonly string[] }) => {
      const targetPath = readFlag(input.args, '--target-path');
      await mkdir(targetPath, { recursive: true });
      await writeFile(
        path.join(targetPath, 'manifest.json'),
        JSON.stringify({
          ...manifest(),
          nodes: {
            ...((manifest().nodes as Record<string, unknown>) ?? {}),
            'model.analytics.orders': {
              ...((manifest().nodes as Record<string, Record<string, unknown>>)[
                'model.analytics.orders'
              ] ?? {}),
              compiled_code: 'select * from raw.orders',
            },
          },
        }),
        'utf8'
      );
      return { kind: 'completed' as const, exitCode: 0, stdout: '', stderr: '' };
    });
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const result = await analyzer.analyze({
      scope: SCOPE,
      projectRoot: 'analytics',
      operation: { kind: 'compile', selectors: ['orders'], targetName: 'production' },
    });

    expect(result.status).toBe('valid');
    expect(
      result.resources.find((resource) => resource.uniqueId === 'model.analytics.orders')
    ).toEqual(expect.objectContaining({ compiledSql: 'select * from raw.orders' }));
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(['compile', '--select', 'orders', '--target', 'production']),
      })
    );
    expect(run.mock.calls[0]?.[0].args).not.toContain('parse');
  });

  it('requires an explicit server-managed analysis profile before invoking dbt', async () => {
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({ workspaceFilesRoot, processRunner: { run } });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_analyzer_profiles_unavailable');
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects an analysis profile stored inside the workspace-file authority root', async () => {
    const workspaceProfile = path.join(workspaceFilesRoot, 'server-profile');
    await mkdir(workspaceProfile, { recursive: true });
    await writeFile(path.join(workspaceProfile, 'profiles.yml'), 'analytics: {}\n', 'utf8');
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory: workspaceProfile,
      processRunner: { run },
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_analyzer_profiles_unavailable');
    expect(run).not.toHaveBeenCalled();
  });

  it('returns unavailable without invoking dbt when the authorized project is absent', async () => {
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'missing' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_project_not_found');
    expect(result.diagnostics[0]?.message).not.toContain(workspaceFilesRoot);
    expect(run).not.toHaveBeenCalled();
  });

  it('returns unavailable when the analyzer process boundary cannot run dbt', async () => {
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: {
        run: vi.fn().mockResolvedValue({
          kind: 'unavailable',
          reason: 'spawn_failure',
          stdout: '',
          stderr: '',
        }),
      },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_analyzer_unavailable');
  });
});
