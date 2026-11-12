/** Owned concern: safe invalid/unavailable evidence; all original runner assertions remain in their cases. */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DbtCliProjectAnalyzer } from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';

import { createDbtAnalyzerFixture, SCOPE } from './DbtCliProjectAnalyzer.fixtures.js';

describe('DbtCliProjectAnalyzer safe invalid/unavailable evidence', () => {
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

  it('returns a safe invalid diagnostic without exposing project-controlled dbt output', async () => {
    const profileSecret = 'warehouse-password-from-target';
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: {
        run: vi.fn().mockResolvedValue({
          kind: 'completed',
          exitCode: 2,
          stdout: '',
          stderr: `Compilation Error in model orders: ${profileSecret} at ${projectDirectory}\\models\\orders.sql`,
        }),
      },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('invalid');
    expect(result.resources).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'dbt_project_invalid',
        severity: 'error',
        message: 'dbt parse rejected the project. Review it in a trusted dbt environment.',
      }),
    ]);
    expect(result.diagnostics[0]?.message).not.toContain(profileSecret);
    expect(result.diagnostics[0]?.message).not.toContain(projectDirectory);
    expect(result.semanticEvidence.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'dbt_project.yml',
          revisionSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        }),
        expect.objectContaining({
          path: 'models/orders.sql',
          revisionSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        }),
      ])
    );
    expect(result.semanticEvidence.identities).toEqual([]);
  });

  it('keeps invalid diagnostics deterministic across process output changes', async () => {
    let invocation = 0;
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: {
        run: vi.fn().mockImplementation(async () => {
          invocation += 1;
          return {
            kind: 'completed',
            exitCode: 2,
            stdout: '',
            stderr: `${invocation === 1 ? '2026-07-13T10:00:00.000Z' : '2026-07-13T10:01:00.000Z'} Compilation Error at ${projectDirectory}\\models\\orders.sql`,
          };
        }),
      },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const first = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });
    const second = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(second.analysisSha256).toBe(first.analysisSha256);
    expect(second.diagnostics).toEqual(first.diagnostics);
    expect(first.diagnostics[0]?.message).toBe(
      'dbt parse rejected the project. Review it in a trusted dbt environment.'
    );
    expect(first.diagnostics[0]?.message).not.toContain(workspaceFilesRoot);
  });

  it('treats a missing current-run manifest as unavailable instead of a valid empty graph', async () => {
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: {
        run: vi.fn().mockResolvedValue({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' }),
      },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_analyzer_unavailable');
    expect(result.semanticEvidence.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'dbt_project.yml' }),
        expect.objectContaining({ path: 'models/orders.sql' }),
      ])
    );
    expect(result.semanticEvidence.identities).toEqual([]);
  });

  it('rejects project content that exceeds the byte budget before invoking dbt', async () => {
    await writeFile(path.join(projectDirectory, 'models', 'oversized.sql'), 'x'.repeat(1_024));
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      maxProjectBytes: 100,
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics[0]?.code).toBe('dbt_project_unreadable');
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects snapshot-escaping dbt paths before invoking the analyzer process', async () => {
    await writeFile(
      path.join(projectDirectory, 'dbt_project.yml'),
      'name: analytics\nversion: 1.0.0\nprofile: analytics\nmodel-paths: [../outside]\n',
      'utf8'
    );
    const run = vi.fn();
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('invalid');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'dbt_project_invalid', severity: 'error' }),
    ]);
    expect(run).not.toHaveBeenCalled();
  });
});
