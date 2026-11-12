/** Owned concern: source, scope and managed-context invalidation using the unchanged native-analysis fixture. */
import { unlink } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

import {
  createDbtAnalysisReuseFixture,
  deferredSignal,
  REUSE_PROFILE,
  REUSE_PROJECT_FILES,
  type DbtAnalysisReuseFixture,
} from './dbtAnalysisReuseFixtures.js';

describe('native dbt analysis reuse source, scope and managed-context invalidation', () => {
  let fixture: DbtAnalysisReuseFixture;
  beforeEach(async () => {
    fixture = await createDbtAnalysisReuseFixture();
  });
  afterEach(async () => {
    await fixture.dispose();
  });

  it.each([
    ['other model', 'models/clients.sql', 'select 2 as client_id\n'],
    [
      'schema',
      'models/schema.yml',
      'version: 2\nmodels:\n  - name: orders\n    description: Updated\n',
    ],
    [
      'configuration',
      'dbt_project.yml',
      REUSE_PROJECT_FILES['dbt_project.yml'].replace('1.0.0', '1.0.1'),
    ],
    ['installed dependency', 'dbt_packages/calendar/macros/value.sql', 'select 1\n'],
  ])('invalidates completed evidence when %s changes', async (_name, sourcePath, content) => {
    const analyzer = fixture.analyzer();
    const first = await analyzer.analyze(fixture.input);
    await fixture.writeSource(sourcePath, content);
    const second = await analyzer.analyze(fixture.input);
    expect(second.status).toBe('valid');
    expect(second.projectRevision.contentSetSha256).not.toBe(
      first.projectRevision.contentSetSha256
    );
    expect(fixture.run).toHaveBeenCalledTimes(2);
  });

  it('invalidates completed evidence when managed profile bytes change', async () => {
    const analyzer = fixture.analyzer();
    await analyzer.analyze(fixture.input);
    await fixture.writeProfile(REUSE_PROFILE.replace('schema: public', 'schema: reporting'));
    expect((await analyzer.analyze(fixture.input)).status).toBe('valid');
    expect(fixture.run).toHaveBeenCalledTimes(2);
  });

  it('refuses retained evidence after the managed profile disappears', async () => {
    const analyzer = fixture.analyzer();
    expect((await analyzer.analyze(fixture.input)).status).toBe('valid');
    await unlink(path.join(fixture.profilesDirectory, 'profiles.yml'));
    expect((await analyzer.analyze(fixture.input)).status).toBe('unavailable');
    expect(fixture.run).toHaveBeenCalledTimes(1);
  });

  it('invalidates effective environment changes but ignores discarded secrets', async () => {
    const analyzer = fixture.analyzer();
    await analyzer.analyze(fixture.input);
    fixture.processEnvironment.DATABASE_URL = 'discarded-secret';
    await analyzer.analyze(fixture.input);
    expect(fixture.run).toHaveBeenCalledTimes(1);
    fixture.processEnvironment.PATH = `${fixture.processEnvironment.PATH ?? ''};other-runtime`;
    expect((await analyzer.analyze(fixture.input)).status).toBe('valid');
    expect(fixture.run).toHaveBeenCalledTimes(2);
  });

  it.each(
    (['parse', 'compile'] as const).flatMap((kind) =>
      (['source', 'profile', 'environment'] as const).map((dimension) => [kind, dimension] as const)
    )
  )('refuses old %s evidence when %s changes during native analysis', async (kind, dimension) => {
    const input = {
      ...fixture.input,
      operation: kind === 'parse' ? { kind } : { kind, selectors: ['orders'] },
    };
    const started = deferredSignal();
    const release = deferredSignal();
    fixture.run.mockImplementationOnce(async (input) => {
      started.resolve();
      await release.promise;
      return fixture.complete(input);
    });
    const analyzer = fixture.analyzer();
    const pending = analyzer.analyze(input);
    await started.promise;
    if (dimension === 'source')
      await fixture.writeSource('models/clients.sql', 'select 3 as client_id\n');
    if (dimension === 'profile')
      await fixture.writeProfile(REUSE_PROFILE.replace('public', 'changed'));
    if (dimension === 'environment') fixture.processEnvironment.PATH = 'changed-path';
    release.resolve();
    expect(await pending).toMatchObject({
      status: 'unavailable',
      diagnostics: [expect.objectContaining({ code: 'dbt_project_changed_during_analysis' })],
    });
    expect((await analyzer.analyze(input)).status).toBe('valid');
    expect(fixture.run).toHaveBeenCalledTimes(2);
  });

  it.each(
    (['parse', 'compile'] as const).flatMap((kind) =>
      (['tenantId', 'projectId', 'environmentId', 'projectRoot'] as const).map(
        (dimension) => [kind, dimension] as const
      )
    )
  )('does not share %s evidence across a different %s', async (kind, dimension) => {
    const input = {
      ...fixture.input,
      operation: kind === 'parse' ? { kind } : { kind, selectors: ['orders'] },
    };
    const other =
      dimension === 'projectRoot'
        ? { ...input, projectRoot: 'other' }
        : { ...input, scope: { ...input.scope, [dimension]: 'other' } };
    await fixture.seedProject(other);
    const analyzer = fixture.analyzer();
    await analyzer.analyze(input);
    const result = await analyzer.analyze(other);
    expect(result.status).toBe('valid');
    expect(result.projectRevision.projectRoot).toBe(other.projectRoot);
    expect(fixture.run).toHaveBeenCalledTimes(2);
  });

  it('does not serve retained success when the authorized project disappears', async () => {
    const analyzer = fixture.analyzer();
    await analyzer.analyze(fixture.input);
    await unlink(
      path.join(
        resolveWorkspaceScopeStorageRoot(fixture.workspaceFilesRoot, fixture.input.scope),
        fixture.input.projectRoot,
        'dbt_project.yml'
      )
    );
    expect((await analyzer.analyze(fixture.input)).status).toBe('unavailable');
    expect(fixture.run).toHaveBeenCalledTimes(1);
  });
});
