// @vitest-environment jsdom
/** Owned concern: publication-row presentation stays explicit, bounded and truthful in both languages. */
import { SourceDataSampleResponseSchema } from '@dvt/contracts';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  RunPublicationSampleFailure,
  RunPublicationSampleState,
} from '../../services/runs/runPublicationSample';
import { RunPublicationSampleTemplate } from './RunPublicationSampleTemplate';
import { runPublicationSampleCopy } from './runPublicationSampleCopy';
import { createRunStatesHarness, setRunStatesLanguage } from './test/RunStatesHarness';

const sample = SourceDataSampleResponseSchema.parse({
  contractVersion: 1,
  connectionId: 'postgresql-local',
  objectId: 'relation/proof/dvt/orders_result',
  columns: [{ name: 'name', type: 'text', nullable: true }],
  rows: [{ values: ['publication-A-row'] }, { values: [null] }, { values: [''] }],
  limit: 20,
  truncated: false,
  provenance: {
    mode: 'live',
    queriedAt: '2026-10-06T10:00:00.000Z',
    limit: 20,
    navigation: 'bounded-first-page',
    sourceRefs: [
      {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'postgresql-local',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/proof/dvt/orders_result',
      },
    ],
  },
});

describe('Run publication sample presentation', () => {
  let harness: ReturnType<typeof createRunStatesHarness>;
  const onLoad = vi.fn(async () => undefined);
  const render = (state: RunPublicationSampleState, language: 'en' | 'es' = 'en'): Promise<void> =>
    harness.render(
      <RunPublicationSampleTemplate
        state={state}
        onLoad={onLoad}
        copy={runPublicationSampleCopy[language]}
      />
    );

  beforeEach(() => {
    setRunStatesLanguage('en');
    onLoad.mockClear();
    harness = createRunStatesHarness();
  });
  afterEach(() => harness.cleanup());

  it('requests no rows until the explicit load action', async () => {
    await render({ kind: 'idle' });
    expect(onLoad).not.toHaveBeenCalled();
    expect(
      harness.container
        .querySelector('[data-slot="run-publication-sample"]')
        ?.getAttribute('data-status')
    ).toBe('idle');
    expect(harness.container.textContent).toContain('up to 20 rows');
    expect(harness.container.textContent).toContain('not a historical snapshot');
    const button = harness.container.querySelector<HTMLButtonElement>(
      '[data-slot="run-publication-sample-load"]'
    );
    expect(button?.textContent).toBe('Load rows');
    await act(async () => button?.click());
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('uses the shared grid with query time, NULL, empty text and an explicit refresh', async () => {
    await render({ kind: 'ready', sample });
    expect(harness.container.querySelector('table')).not.toBeNull();
    expect(harness.container.textContent).toContain('publication-A-row');
    expect(harness.container.textContent).toContain('NULL');
    expect(
      harness.container.querySelector(
        '[data-slot="bottom-operational-data-value"][aria-label="Empty text"]'
      )
    ).not.toBeNull();
    expect(harness.container.querySelector('time')?.dateTime).toBe(sample.provenance.queriedAt);
    expect(onLoad).not.toHaveBeenCalled();
    const button = harness.container.querySelector<HTMLButtonElement>(
      '[data-slot="run-publication-sample-load"]'
    );
    expect(button?.textContent).toBe('Refresh rows');
    await act(async () => button?.click());
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('hides previous rows and disables duplicate requests while loading', async () => {
    await render({ kind: 'ready', sample });
    await render({ kind: 'loading' });
    const button = harness.container.querySelector<HTMLButtonElement>(
      '[data-slot="run-publication-sample-load"]'
    );
    expect(button?.disabled).toBe(true);
    expect(harness.container.querySelector('[role="status"]')?.textContent).toContain(
      'Loading rows'
    );
    expect(harness.container.textContent).not.toContain('publication-A-row');
    expect(harness.container.querySelector('table')).toBeNull();
    await act(async () => button?.click());
    expect(onLoad).not.toHaveBeenCalled();
  });

  it.each<RunPublicationSampleFailure>([
    'publication_changed',
    'connection_not_found',
    'source_object_not_found',
    'auth-required',
    'access-denied',
    'unavailable',
  ])('shows typed %s feedback without stale rows', async (reason) => {
    await render({ kind: 'ready', sample });
    await render({ kind: 'error', reason });
    expect(harness.container.querySelector('[role="alert"]')?.textContent).toBe(
      runPublicationSampleCopy.en.failures[reason]
    );
    expect(harness.container.querySelector('table')).toBeNull();
    expect(harness.container.textContent).not.toContain('publication-A-row');
  });

  it('does not offer a query when publication identity or scope is unavailable', async () => {
    await render({ kind: 'unavailable' });
    expect(harness.container.textContent).toContain(runPublicationSampleCopy.en.unavailable);
    expect(harness.container.querySelector('[data-slot="run-publication-sample-load"]')).toBeNull();
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('describes an empty sample without confusing it with absent evidence', async () => {
    await render({ kind: 'ready', sample: { ...sample, rows: [] } });
    expect(harness.container.textContent).toContain('No rows were returned by this query');
    expect(harness.container.querySelector('time')).not.toBeNull();
  });

  it('identifies truncation without promising the whole result', async () => {
    await render({ kind: 'ready', sample: { ...sample, truncated: true } });
    expect(harness.container.textContent).toContain(
      'More rows exist; only the first page is shown'
    );
  });

  it('localizes actions and publication-conflict recovery in Spanish', async () => {
    setRunStatesLanguage('es');
    await render({ kind: 'idle' }, 'es');
    expect(harness.container.textContent).toContain('Cargar filas');
    expect(harness.container.textContent).toContain('hasta 20 filas');
    await render({ kind: 'error', reason: 'publication_changed' }, 'es');
    expect(harness.container.querySelector('[role="alert"]')?.textContent).toContain(
      'ya no coincide'
    );
    expect(harness.container.querySelector('[role="alert"]')?.textContent).toContain('evidencia');
  });
});
