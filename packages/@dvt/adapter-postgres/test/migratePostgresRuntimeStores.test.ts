import { describe, expect, it, vi } from 'vitest';

import { migratePostgresRuntimeStores } from '../src/migratePostgresRuntimeStores.js';

describe('migratePostgresRuntimeStores', () => {
  it('migrates state store before start-run intent store', async () => {
    const calls: string[] = [];
    const stateStore = {
      migrate: vi.fn(async () => {
        calls.push('state');
      }),
    };
    const startRunIntentStore = {
      migrate: vi.fn(async () => {
        calls.push('intent');
      }),
    };

    await migratePostgresRuntimeStores({ stateStore, startRunIntentStore });

    expect(calls).toEqual(['state', 'intent']);
    expect(stateStore.migrate).toHaveBeenCalledTimes(1);
    expect(startRunIntentStore.migrate).toHaveBeenCalledTimes(1);
  });

  it('does not attempt intent migration when state migration fails', async () => {
    const stateStore = {
      migrate: vi.fn(async () => {
        throw new Error('state migration failed');
      }),
    };
    const startRunIntentStore = {
      migrate: vi.fn(async () => undefined),
    };

    await expect(migratePostgresRuntimeStores({ stateStore, startRunIntentStore })).rejects.toThrow(
      'state migration failed'
    );
    expect(startRunIntentStore.migrate).not.toHaveBeenCalled();
  });
});
