/** Owned concern: bounded in-flight sharing and recovery using the unchanged native-analysis fixture. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DbtAnalysisReuse } from '../../../src/infrastructure/dbt/dbtAnalysisReuse.js';

import {
  createDbtAnalysisReuseFixture,
  deferredSignal,
  type DbtAnalysisReuseFixture,
} from './dbtAnalysisReuseFixtures.js';

describe('native dbt analysis reuse bounded in-flight sharing and recovery', () => {
  let fixture: DbtAnalysisReuseFixture;
  beforeEach(async () => {
    fixture = await createDbtAnalysisReuseFixture();
  });
  afterEach(async () => {
    await fixture.dispose();
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
});
