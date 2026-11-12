/** Owned concern: bounded snapshot contents and live drift; all original runner assertions remain in their cases. */
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DbtCliProjectAnalyzer } from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';
import { hashProjectContent } from '../../../src/infrastructure/dbt/dbtProjectContentRevision.js';

import {
  createDbtAnalyzerFixture,
  SCOPE,
  readFlag,
  manifest,
} from './DbtCliProjectAnalyzer.fixtures.js';

describe('DbtCliProjectAnalyzer bounded snapshot contents and live drift', () => {
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

  it('excludes generated artifacts while preserving installed dependencies for parsing', async () => {
    await writeFile(
      path.join(projectDirectory, 'dbt_project.yml'),
      [
        'name: analytics',
        'version: 1.0.0',
        'profile: analytics',
        'model-paths: [models]',
        'target-path: generated/target',
        'log-path: generated/logs',
        'packages-install-path: vendor/dbt',
        '',
      ].join('\n'),
      'utf8'
    );
    await rm(path.join(projectDirectory, 'target'), { recursive: true, force: true });
    const processRunner = {
      run: vi.fn().mockImplementation(async (input: { args: readonly string[] }) => {
        const projectPath = readFlag(input.args, '--project-dir');
        await expect(stat(path.join(projectPath, 'generated', 'target'))).rejects.toThrow();
        await expect(stat(path.join(projectPath, 'generated', 'logs'))).rejects.toThrow();
        await expect(
          readFile(path.join(projectPath, 'vendor', 'dbt', 'macros', 'package_macro.sql'), 'utf8')
        ).resolves.toContain('macro package_macro');
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
      maxProjectBytes: 512,
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });
    await mkdir(path.join(projectDirectory, 'generated', 'target'), { recursive: true });
    await mkdir(path.join(projectDirectory, 'generated', 'logs'), { recursive: true });
    await mkdir(path.join(projectDirectory, 'vendor', 'dbt', 'macros'), { recursive: true });
    await writeFile(path.join(projectDirectory, 'generated', 'target', 'manifest.json'), '{}');
    await writeFile(
      path.join(projectDirectory, 'vendor', 'dbt', 'macros', 'package_macro.sql'),
      '{% macro package_macro() %}1{% endmacro %}\n'
    );

    const first = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });
    await writeFile(
      path.join(projectDirectory, 'generated', 'target', 'manifest.json'),
      'x'.repeat(4_096)
    );
    await writeFile(
      path.join(projectDirectory, 'generated', 'logs', 'dbt.log'),
      'changed runtime log'
    );
    const afterGeneratedArtifactChange = await analyzer.analyze({
      scope: SCOPE,
      projectRoot: 'analytics',
    });
    await writeFile(
      path.join(projectDirectory, 'vendor', 'dbt', 'macros', 'package_macro.sql'),
      '{% macro package_macro() %}2{% endmacro %}\n'
    );
    const afterDependencyChange = await analyzer.analyze({
      scope: SCOPE,
      projectRoot: 'analytics',
    });

    expect(first.status).toBe('valid');
    expect(afterGeneratedArtifactChange.status).toBe('valid');
    expect(afterDependencyChange.status).toBe('valid');
    expect(afterGeneratedArtifactChange.projectRevision.contentSetSha256).toBe(
      first.projectRevision.contentSetSha256
    );
    expect(afterGeneratedArtifactChange.analysisSha256).toBe(first.analysisSha256);
    expect(afterDependencyChange.projectRevision.contentSetSha256).not.toBe(
      afterGeneratedArtifactChange.projectRevision.contentSetSha256
    );
  });

  it('hashes and parses the same isolated snapshot but refuses evidence after live source drift', async () => {
    const originalSql = "select * from {{ source('raw', 'orders') }}\n";
    const changedSql = 'select 1 as changed_while_parsing\n';
    let analyzedProjectDirectory = '';
    let analyzedSql = '';
    const run = vi
      .fn()
      .mockImplementation(async (input: { args: readonly string[]; cwd: string }) => {
        analyzedProjectDirectory = readFlag(input.args, '--project-dir');
        analyzedSql = await readFile(
          path.join(analyzedProjectDirectory, 'models', 'orders.sql'),
          'utf8'
        );
        await writeFile(path.join(projectDirectory, 'models', 'orders.sql'), changedSql, 'utf8');
        const targetPath = readFlag(input.args, '--target-path');
        await mkdir(targetPath, { recursive: true });
        await writeFile(path.join(targetPath, 'manifest.json'), JSON.stringify(manifest()), 'utf8');
        return { kind: 'completed' as const, exitCode: 0, stdout: '', stderr: '' };
      });
    const analyzer = new DbtCliProjectAnalyzer({
      workspaceFilesRoot,
      profilesDirectory,
      processRunner: { run },
      now: () => new Date('2026-07-13T10:00:00.000Z'),
    });
    const expectedRevision = await hashProjectContent(
      projectDirectory,
      {
        maxFiles: 10_000,
        maxBytes: 50_000_000,
        maxDirectories: 5_000,
        maxDepth: 64,
      },
      {
        excludedDirectoryPaths: ['target', 'logs'],
      }
    );

    const result = await analyzer.analyze({ scope: SCOPE, projectRoot: 'analytics' });

    expect(result.status).toBe('unavailable');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'dbt_project_changed_during_analysis' }),
    ]);
    expect(result.projectRevision.contentSetSha256).toBe(expectedRevision.sha256);
    expect(analyzedSql).toBe(originalSql);
    expect(analyzedProjectDirectory).not.toBe(projectDirectory);
    expect(path.relative(projectDirectory, analyzedProjectDirectory)).toMatch(/^\.\./);
    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: analyzedProjectDirectory,
        args: expect.arrayContaining(['--project-dir', analyzedProjectDirectory]),
      })
    );
    await expect(stat(analyzedProjectDirectory)).rejects.toThrow();
  });
});
