import { describe, expect, it } from 'vitest';

import { PostgresDuplicateRunProbe } from '../../../src/infrastructure/startRun/PostgresDuplicateRunProbe.js';

class RecordingPool {
  public readonly queries: Array<{
    readonly text: string;
    readonly values: unknown[] | undefined;
    readonly signal?: unknown;
  }> = [];

  public constructor(private readonly rows: unknown[]) {}

  public async query<T>(input: {
    text: string;
    values?: unknown[];
    signal?: unknown;
  }): Promise<{ rows: T[] }> {
    this.queries.push(input);
    return { rows: this.rows as T[] };
  }
}

describe('PostgresDuplicateRunProbe', () => {
  it('prefers a persisted run over an active intent and applies timeout signal', async () => {
    const pool = new RecordingPool([{ kind: 'found_run', run_id: 'run-1' }]);
    const probe = new PostgresDuplicateRunProbe({
      pool: pool as never,
      schema: 'dvt',
      queryTimeoutMs: 500,
    });

    await expect(probe.findExisting('tenant-a', 'run-1')).resolves.toEqual({
      kind: 'found_run',
      runId: 'run-1',
    });
    expect(pool.queries).toHaveLength(1);
    expect(pool.queries[0]?.text).toContain('"dvt".run_metadata');
    expect(pool.queries[0]?.text).toContain('"dvt".start_run_intents');
    expect(pool.queries[0]?.values).toEqual(['tenant-a', 'run-1']);
    expect(pool.queries[0]?.signal).toBeDefined();
  });

  it('returns active intent match when no persisted run exists', async () => {
    const pool = new RecordingPool([{ kind: 'found_intent', run_id: 'run-2' }]);
    const probe = new PostgresDuplicateRunProbe({
      pool: pool as never,
      schema: 'dvt',
    });

    await expect(probe.findExisting('tenant-a', 'run-2')).resolves.toEqual({
      kind: 'found_intent',
      runId: 'run-2',
    });
  });

  it('returns not_found when neither run nor active intent exists', async () => {
    const pool = new RecordingPool([]);
    const probe = new PostgresDuplicateRunProbe({
      pool: pool as never,
      schema: 'dvt',
    });

    await expect(probe.findExisting('tenant-a', 'run-missing')).resolves.toEqual({
      kind: 'not_found',
    });
  });
});
