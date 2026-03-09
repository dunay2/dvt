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
});
