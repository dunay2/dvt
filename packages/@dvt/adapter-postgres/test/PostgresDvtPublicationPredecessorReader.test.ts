import { describe, expect, it, vi } from 'vitest';

import { PostgresDvtPublicationPredecessorReader } from '../src/PostgresDvtPublicationPredecessorReader.js';

const SCHEMA_DIGEST = 'a'.repeat(64);
const TOKEN = 'b'.repeat(64);
const TARGET = {
  schemaVersion: 'dvt-transform-result-target.v1' as const,
  connectionRef: {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'warehouse-a',
    provider: 'postgres',
  },
  schema: 'analytics',
  relation: 'orders_result',
};

describe('PostgresDvtPublicationPredecessorReader', () => {
  it('observes an absent target without inventing a predecessor', async () => {
    const harness = createHarness([]);

    await expect(harness.reader.observe(input())).resolves.toEqual({
      ok: true,
      predecessorToken: null,
    });
    expect(harness.end).toHaveBeenCalledOnce();
  });

  it('returns the token from one managed target', async () => {
    const harness = createHarness([
      {
        relationKind: 'r',
        ownedByCurrentRole: true,
        marker: `dvt:publication:v1;token=${TOKEN};schema=${SCHEMA_DIGEST}`,
      },
    ]);

    await expect(harness.reader.observe(input())).resolves.toEqual({
      ok: true,
      predecessorToken: TOKEN,
    });
  });

  it('rejects an unmanaged target', async () => {
    const harness = createHarness([
      { relationKind: 'r', ownedByCurrentRole: true, marker: 'user-owned comment' },
    ]);

    await expect(harness.reader.observe(input())).resolves.toEqual({
      ok: false,
      reason: 'unmanaged_target',
    });
  });

  it('rejects a marker for another schema', async () => {
    const harness = createHarness([
      {
        relationKind: 'r',
        ownedByCurrentRole: true,
        marker: `dvt:publication:v1;token=${TOKEN};schema=${'c'.repeat(64)}`,
      },
    ]);

    await expect(harness.reader.observe(input())).resolves.toEqual({
      ok: false,
      reason: 'schema_mismatch',
    });
  });
});

function input(): Parameters<PostgresDvtPublicationPredecessorReader['observe']>[0] {
  return {
    credentialRef: 'postgres:warehouse-a',
    target: TARGET,
    schemaDigestSha256: SCHEMA_DIGEST,
  };
}

function createHarness(rows: readonly unknown[]): {
  readonly reader: PostgresDvtPublicationPredecessorReader;
  readonly query: ReturnType<typeof vi.fn>;
  readonly end: ReturnType<typeof vi.fn>;
} {
  const query = vi.fn(async () => ({ rows, rowCount: rows.length }));
  const end = vi.fn(async () => undefined);
  return {
    reader: new PostgresDvtPublicationPredecessorReader({
      credentialResolver: { resolveCredential: vi.fn(async () => 'postgresql://local/test') },
      poolFactory: () => ({ query, end }) as never,
    }),
    query,
    end,
  };
}
