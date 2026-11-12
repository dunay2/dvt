/** Owned concern: retention, independent query authority and numeric observation using the unchanged native-analysis fixture. */
import type { CanvasAuthoringAuthorityBinding } from '@dvt/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DbtProjectFileAuthorityRequiredError } from '../../../src/application/ports/dbtProjectImport.js';
import { AnalyzeSelectedDbtModelQuery } from '../../../src/application/services/analyzeSelectedDbtModelQuery.js';
import { ProjectDbtGraphFromFilesUseCase } from '../../../src/application/services/projectDbtGraphFromFilesUseCase.js';
import { SelectedDbtModelAnalysisResolver } from '../../../src/application/services/selectedDbtModelAnalysisResolver.js';
import type { DbtCliProjectAnalyzerOptions } from '../../../src/infrastructure/dbt/DbtCliProjectAnalyzer.js';

import {
  createDbtAnalysisReuseFixture,
  type DbtAnalysisReuseFixture,
} from './dbtAnalysisReuseFixtures.js';

describe('native dbt analysis reuse retention, independent query authority and numeric observation', () => {
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
