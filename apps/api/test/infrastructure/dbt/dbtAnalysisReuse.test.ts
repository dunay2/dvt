/** Owned concern: identity, concurrency and retention of eligible native analysis evidence. */
import { unlink } from 'node:fs/promises';
import path from 'node:path';

import type { CanvasAuthoringAuthorityBinding } from '@dvt/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DbtProjectFileAuthorityRequiredError } from '../../../src/application/ports/dbtProjectImport.js';
import { AnalyzeSelectedDbtModelQuery } from '../../../src/application/services/analyzeSelectedDbtModelQuery.js';
import { ProjectDbtGraphFromFilesUseCase } from '../../../src/application/services/projectDbtGraphFromFilesUseCase.js';
import { SelectedDbtModelAnalysisResolver } from '../../../src/application/services/selectedDbtModelAnalysisResolver.js';
import { DbtAnalysisReuse } from '../../../src/infrastructure/dbt/dbtAnalysisReuse.js';
import type { DbtCliProjectAnalyzerOptions } from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';
import { resolveWorkspaceScopeStorageRoot } from '../../../src/infrastructure/workspaceFiles/workspaceScopeStoragePath.js';

import {
  createDbtAnalysisReuseFixture,
  deferredSignal,
  REUSE_PROFILE,
  REUSE_PROJECT_FILES,
  type DbtAnalysisReuseFixture,
} from './dbtAnalysisReuseFixtures.js';

describe('native dbt analysis reuse', () => {
  let fixture: DbtAnalysisReuseFixture;
  beforeEach(async () => {
    fixture = await createDbtAnalysisReuseFixture();
  });
  afterEach(async () => {
    await fixture.dispose();
  });

  it('reuses the same evidence and original analysis time for identical inputs', async () => {
    let currentTime = new Date('2026-08-01T10:00:00Z');
    const analyzer = fixture.analyzer({ now: () => currentTime });
    const first = await analyzer.analyze(fixture.input);
    currentTime = new Date('2026-08-01T11:00:00Z');
    const second = await analyzer.analyze(fixture.input);
    expect(first.status).toBe('valid');
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(fixture.run).toHaveBeenCalledTimes(1);
  });

  it('starts cold when the runtime is recomposed as a new analyzer instance', async () => {
    const firstRuntime = fixture.analyzer();
    await firstRuntime.analyze(fixture.input);
    await firstRuntime.analyze(fixture.input);
    const nextRuntime = fixture.analyzer();
    expect((await nextRuntime.analyze(fixture.input)).status).toBe('valid');
    expect(fixture.run).toHaveBeenCalledTimes(2);
  });

  it('shares graph and selected-model evidence while checking current authority for each query', async () => {
    let binding: CanvasAuthoringAuthorityBinding = {
      schemaVersion: 'canvas-authoring-authority-binding.v1',
      canvasId: 'canvas-reuse',
      authority: { kind: 'dbt-project-files', projectRoot: fixture.input.projectRoot },
    };
    const authorityPolicy = { resolve: vi.fn(async () => binding) };
    const analyzer = fixture.analyzer();
    const graph = new ProjectDbtGraphFromFilesUseCase({
      analyzer,
      sourceRevisionReader: analyzer,
      authorityPolicy,
      executionTargetResolver: { resolve: () => null },
      executionConnectionBindingVerifier: { verify: vi.fn() },
      connectionCatalog: { getConnection: vi.fn() },
    });
    const selected = new AnalyzeSelectedDbtModelQuery(
      new SelectedDbtModelAnalysisResolver({ analyzer, authorityPolicy })
    );
    const input = { scope: fixture.input.scope, canvasId: binding.canvasId };
    const selection = { ...input, selectedUniqueId: 'model.analytics.orders' };
    const graphResult = await graph.execute(input);
    const selectedResult = await selected.execute(selection);
    expect(graphResult.freshness).toBe('fresh');
    expect(selectedResult.status).toBe('ready');
    expect(selectedResult.analysisSha256).toBe(graphResult.analysisSha256);
    expect(selectedResult.projectRevision).toEqual(graphResult.projectRevision);
    expect(selectedResult.regions).toEqual([
      expect.objectContaining({
        classification: 'supported',
        targetUniqueId: 'model.analytics.clients',
      }),
    ]);
    expect(fixture.run).toHaveBeenCalledTimes(1);

    binding = { ...binding, authority: { kind: 'graph-draft' } };
    await expect(graph.execute(input)).rejects.toBeInstanceOf(DbtProjectFileAuthorityRequiredError);
    await expect(selected.execute(selection)).rejects.toBeInstanceOf(
      DbtProjectFileAuthorityRequiredError
    );
    expect(authorityPolicy.resolve).toHaveBeenCalledTimes(4);
    expect(fixture.run).toHaveBeenCalledTimes(1);
  });

  it('shares successful evidence among overlapping equivalent requests', async () => {
    const started = deferredSignal();
    const release = deferredSignal();
    fixture.run.mockImplementation(async (input) => {
      started.resolve();
      await release.promise;
      return fixture.complete(input);
    });
    const analyzer = fixture.analyzer();
    const pending = [1, 2, 3].map(() => analyzer.analyze(fixture.input));
    await started.promise;
    release.resolve();
    const results = await Promise.all(pending);
    expect(results.every((result) => result.status === 'valid')).toBe(true);
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(fixture.run).toHaveBeenCalledTimes(1);
  });

  it('joins one in-flight computation even when completed evidence is not retained', async () => {
    const evidence = await fixture.analyzer().analyze(fixture.input);
    const started = deferredSignal();
    const release = deferredSignal();
    const analyze = vi.fn(async () => {
      started.resolve();
      await release.promise;
      return evidence;
    });
    const reuse = new DbtAnalysisReuse(8, 0);
    const first = reuse.getOrAnalyze('same-revision', analyze);
    const second = reuse.getOrAnalyze('same-revision', analyze);
    await started.promise;
    release.resolve();
    const results = await Promise.all([first, second]);
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(results.map((result) => result.disposition)).toEqual(['executed', 'joined']);
    expect(results.map((result) => result.analysis)).toEqual([evidence, evidence]);
    expect((await reuse.getOrAnalyze('same-revision', analyze)).disposition).toBe('executed');
    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it('bounds distinct pending work without retaining overflow and frees capacity after completion', async () => {
    const evidence = await fixture.analyzer().analyze(fixture.input);
    const started = deferredSignal();
    const release = deferredSignal();
    const held = vi.fn(async () => {
      started.resolve();
      await release.promise;
      return evidence;
    });
    const overflow = vi.fn(async () => evidence);
    const reuse = new DbtAnalysisReuse(1);
    const pending = reuse.getOrAnalyze('first-revision', held);
    await started.promise;
    const overflowResult = await reuse
      .getOrAnalyze('second-revision', overflow)
      .finally(() => release.resolve());
    expect(overflowResult.disposition).toBe('bypassed');
    expect((await pending).disposition).toBe('executed');
    expect((await reuse.getOrAnalyze('second-revision', overflow)).disposition).toBe('executed');
    expect((await reuse.getOrAnalyze('second-revision', overflow)).disposition).toBe('reused');
    expect(held).toHaveBeenCalledTimes(1);
    expect(overflow).toHaveBeenCalledTimes(2);
  });

  it.each(['invalid', 'unavailable', 'rejected'] as const)(
    'clears shared %s work so a fresh computation can recover',
    async (failure) => {
      const evidence = await fixture.analyzer().analyze(fixture.input);
      const started = deferredSignal();
      const release = deferredSignal();
      const analyze = vi
        .fn(async () => evidence)
        .mockImplementationOnce(async () => {
          started.resolve();
          await release.promise;
          if (failure === 'rejected') throw new Error('Analysis failed');
          return { ...evidence, status: failure, resources: [], dependencies: [] };
        });
      const reuse = new DbtAnalysisReuse();
      const pending = Promise.allSettled([
        reuse.getOrAnalyze('same-revision', analyze),
        reuse.getOrAnalyze('same-revision', analyze),
      ]);
      await started.promise;
      release.resolve();
      const results = await pending;
      expect(analyze).toHaveBeenCalledTimes(1);
      if (failure === 'rejected') {
        expect(results).toEqual([
          { status: 'rejected', reason: expect.any(Error) },
          { status: 'rejected', reason: expect.any(Error) },
        ]);
      } else {
        expect(results).toEqual([
          expect.objectContaining({
            status: 'fulfilled',
            value: expect.objectContaining({
              analysis: expect.objectContaining({ status: failure }),
            }),
          }),
          expect.objectContaining({
            status: 'fulfilled',
            value: expect.objectContaining({
              analysis: expect.objectContaining({ status: failure }),
            }),
          }),
        ]);
      }
      expect(await reuse.getOrAnalyze('same-revision', analyze)).toEqual({
        analysis: evidence,
        disposition: 'executed',
      });
      expect((await reuse.getOrAnalyze('same-revision', analyze)).disposition).toBe('reused');
      expect(analyze).toHaveBeenCalledTimes(2);
    }
  );

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

  it.each(['invalid', 'unavailable', 'rejected'] as const)(
    'does not retain %s work or poison its next successful attempt',
    async (failure) => {
      if (failure === 'rejected')
        fixture.run.mockRejectedValueOnce(new Error('fixture process failure'));
      else if (failure === 'invalid')
        fixture.run.mockResolvedValueOnce({
          kind: 'completed',
          exitCode: 2,
          stdout: '',
          stderr: '',
        });
      else
        fixture.run.mockResolvedValueOnce({
          kind: 'unavailable',
          reason: 'timeout',
          stdout: '',
          stderr: '',
        });
      const analyzer = fixture.analyzer();
      expect((await analyzer.analyze(fixture.input)).status).toBe(
        failure === 'invalid' ? 'invalid' : 'unavailable'
      );
      const successful = await analyzer.analyze(fixture.input);
      expect(successful.status).toBe('valid');
      expect(await analyzer.analyze(fixture.input)).toEqual(successful);
      expect(fixture.run).toHaveBeenCalledTimes(2);
    }
  );

  it.each(
    (['parse', 'compile'] as const).flatMap((kind) =>
      (['model', 'profile'] as const).map((location) => [kind, location] as const)
    )
  )('bypasses %s reuse for dynamic Jinja in the %s', async (kind, location) => {
    const input = {
      ...fixture.input,
      operation: kind === 'parse' ? { kind } : { kind, selectors: ['orders'] },
    };
    if (location === 'model')
      await fixture.writeSource('models/orders.sql', 'select {{ run_started_at }}\n');
    else
      await fixture.writeProfile(
        REUSE_PROFILE.replace('schema: public', 'schema: "{{ env_var(\'DBT_SCHEMA\') }}"')
      );
    const analyzer = fixture.analyzer();
    expect((await analyzer.analyze(input)).status).toBe('valid');
    expect((await analyzer.analyze(input)).status).toBe('valid');
    expect(fixture.run).toHaveBeenCalledTimes(2);
  });

  it('executes compilation independently from retained parse evidence', async () => {
    const analyzer = fixture.analyzer();
    await analyzer.analyze(fixture.input);
    const compile = {
      ...fixture.input,
      operation: { kind: 'compile' as const, selectors: ['orders'] },
    };
    const compiled = await analyzer.analyze(compile);
    expect(compiled.resources.find((resource) => resource.name === 'orders')?.compiledSql).toBe(
      'select client_id from "public"."clients"'
    );
    expect(await analyzer.analyze(compile)).toEqual(compiled);
    await analyzer.analyze(fixture.input);
    expect(fixture.run).toHaveBeenCalledTimes(2);
    expect(fixture.run.mock.calls.slice(1).every(([input]) => input.args[0] === 'compile')).toBe(
      true
    );
  });

  it('separates model selections and shares reordered equivalent compilation selections', async () => {
    const analyzer = fixture.analyzer();
    const compile = (selectors: readonly string[]): ReturnType<typeof analyzer.analyze> =>
      analyzer.analyze({ ...fixture.input, operation: { kind: 'compile', selectors } });
    const orders = await compile(['orders']);
    const clients = await compile(['clients']);
    expect(
      orders.resources.find((resource) => resource.name === 'clients')?.compiledSql
    ).toBeUndefined();
    expect(
      clients.resources.find((resource) => resource.name === 'orders')?.compiledSql
    ).toBeUndefined();
    const both = await compile(['orders', 'clients']);
    expect(await compile(['clients', 'orders', 'clients'])).toEqual(both);
    expect(fixture.run).toHaveBeenCalledTimes(3);
  });

  it('joins concurrent static compilations without borrowing parse evidence', async () => {
    const analyzer = fixture.analyzer();
    await analyzer.analyze(fixture.input);
    const started = deferredSignal();
    const release = deferredSignal();
    fixture.run.mockImplementation(async (input) => {
      started.resolve();
      await release.promise;
      return fixture.complete(input);
    });
    const input = {
      ...fixture.input,
      operation: { kind: 'compile' as const, selectors: ['orders'] },
    };
    const pending = [1, 2, 3].map(() => analyzer.analyze(input));
    await started.promise;
    release.resolve();
    const results = await Promise.all(pending);
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(
      results[0]?.resources.find((resource) => resource.name === 'orders')?.compiledSql
    ).toBeDefined();
    expect(fixture.run).toHaveBeenCalledTimes(2);
  });

  it('keeps recently read evidence and evicts the least recently used entry at capacity', async () => {
    const second = await fixture.seedProject({ ...fixture.input, projectRoot: 'second' });
    const third = await fixture.seedProject({ ...fixture.input, projectRoot: 'third' });
    const analyzer = fixture.analyzer({ maxCachedAnalyses: 2 });
    for (const input of [fixture.input, second, fixture.input, third, second]) {
      expect((await analyzer.analyze(input)).status).toBe('valid');
    }
    expect(fixture.run).toHaveBeenCalledTimes(4);
  });

  it.each([{ maxCachedAnalyses: 0 }, { maxCachedAnalysisBytes: 1 }])(
    'does not retain evidence beyond the configured bound %j',
    async (limits) => {
      const analyzer = fixture.analyzer(limits);
      await analyzer.analyze(fixture.input);
      await analyzer.analyze(fixture.input);
      expect(fixture.run).toHaveBeenCalledTimes(2);
    }
  );

  it('isolates retained evidence from consumer mutation', async () => {
    const analyzer = fixture.analyzer();
    const first = await analyzer.analyze(fixture.input);
    const resource = first.resources[0];
    if (resource === undefined) throw new Error('Expected fixture resource');
    const name = resource.name;
    Reflect.set(resource, 'name', 'consumer-mutated');
    const second = await analyzer.analyze(fixture.input);
    expect(second.resources[0]?.name).toBe(name);
    expect(second.resources[0]).not.toBe(resource);
    expect(fixture.run).toHaveBeenCalledTimes(1);
  });

  it('observes numeric timing and reuse disposition without exposing inputs', async () => {
    const events: unknown[] = [];
    const options: Partial<DbtCliProjectAnalyzerOptions> = {
      onAnalysis: (event) => events.push(event),
    };
    const analyzer = fixture.analyzer(options);
    await analyzer.analyze(fixture.input);
    await analyzer.analyze(fixture.input);
    expect(events).toEqual([
      expect.objectContaining({
        operation: 'parse',
        status: 'valid',
        reuse: 'executed',
        totalMs: expect.any(Number),
        processMs: expect.any(Number),
      }),
      expect.objectContaining({
        operation: 'parse',
        status: 'valid',
        reuse: 'reused',
        totalMs: expect.any(Number),
      }),
    ]);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('fixture-only');
    expect(serialized).not.toContain('select ');
    expect(serialized).not.toContain(fixture.root);
    expect(serialized).not.toContain('contentSetSha256');
  });
});
