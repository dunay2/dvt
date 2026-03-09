import { describe, expect, it } from 'vitest';

import { PostgresStateStoreAdapter } from '../src/PostgresStateStoreAdapter.js';

class BlockingPoolClient {
  public readonly releaseCalls: boolean[] = [];
  private pendingReject: ((error: Error) => void) | null = null;

  async query(sql: string): Promise<{ rows: unknown[]; rowCount: number }> {
    const statement = sql.trim();
    if (
      statement === 'BEGIN' ||
      statement === 'COMMIT' ||
      statement === 'ROLLBACK' ||
      statement.startsWith('SET LOCAL statement_timeout')
    ) {
      return { rows: [], rowCount: 0 };
    }

    return new Promise<{ rows: unknown[]; rowCount: number }>((_resolve, reject) => {
      this.pendingReject = reject;
    });
  }

  release(destroy?: boolean): void {
    this.releaseCalls.push(destroy ?? false);
    if (destroy) {
      this.pendingReject?.(new Error('synthetic connection terminated'));
      this.pendingReject = null;
    }
  }
}

describe('PostgresStateStoreAdapter shutdown interruption', () => {
  it('aborts an in-flight outbox query by destroying the active client', async () => {
    const client = new BlockingPoolClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
      } as never,
      assumeSchemaReady: true,
    });

    const pendingList = adapter.listPending(1);
    await new Promise((resolve) => setTimeout(resolve, 0));

    await adapter.abortPendingOperations();

    await expect(pendingList).rejects.toThrow(/synthetic connection terminated/);
    expect(client.releaseCalls).toContain(true);
  });

  it('aborts an in-flight read query that uses a tracked client during shutdown', async () => {
    const client = new BlockingPoolClient();
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => client,
        query: async () => new Promise(() => {}),
      } as never,
      assumeSchemaReady: true,
    });

    const pendingSnapshot = adapter.getSnapshot('tenant-1', 'run-1' as never);
    await new Promise((resolve) => setTimeout(resolve, 0));

    await adapter.abortPendingOperations();

    const outcome = await Promise.race([
      pendingSnapshot.then(
        () => 'resolved',
        (error) => (error instanceof Error ? error.message : String(error))
      ),
      new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 25)),
    ]);

    expect(outcome).toMatch(/synthetic connection terminated/);
    expect(client.releaseCalls).toContain(true);
  });

  it('rejects new outbox writes after shutdown interruption begins', async () => {
    let connectCalls = 0;
    const adapter = new PostgresStateStoreAdapter({
      pool: {
        connect: async () => {
          connectCalls += 1;
          throw new Error('connect should not be called after interruption');
        },
      } as never,
      assumeSchemaReady: true,
    });

    await adapter.abortPendingOperations();

    await expect(adapter.markFailed('outbox_1', 'synthetic failure')).rejects.toThrow(
      /PENDING_OPERATIONS_ABORTED/
    );
    expect(connectCalls).toBe(0);
  });
});
