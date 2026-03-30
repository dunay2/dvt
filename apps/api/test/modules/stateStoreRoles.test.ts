import { describe, expect, it } from 'vitest';

import type { StateStoreRoleSource } from '../../src/modules/stateStoreRoles.js';
import { bindStateStoreRoles } from '../../src/modules/stateStoreRoles.js';

function createStateStoreSource(): StateStoreRoleSource {
  return {
    bootstrapRunTx: async () => null as never,
    appendAndEnqueueTx: async () => null as never,
    getRunMetadataByRunId: async () => null as never,
    listEvents: async () => [],
    listRuns: async () => [],
    getSnapshot: async () => null as never,
    rebuildSnapshot: async () => null as never,
    isSnapshotStale: async () => false,
  };
}

describe('bindStateStoreRoles', () => {
  it('returns an immutable explicit role bundle', () => {
    const source = createStateStoreSource();

    const bindings = bindStateStoreRoles(source);

    expect(Object.isFrozen(bindings)).toBe(true);
    expect(bindings.read).toBe(source);
    expect(bindings.write).toBe(source);
    expect(bindings.maintenance).toBe(source);
    expect(bindings.snapshotStaleness).toBe(source);
  });

  it('rejects a partial source missing maintenance behavior', () => {
    const partialSource = {
      bootstrapRunTx: async () => null as never,
      appendAndEnqueueTx: async () => null as never,
      getRunMetadataByRunId: async () => null as never,
      listEvents: async () => [],
      listRuns: async () => [],
      getSnapshot: async () => null as never,
      rebuildSnapshot: async () => null as never,
    } satisfies Omit<StateStoreRoleSource, 'isSnapshotStale'>;

    expect(() => bindStateStoreRoles(partialSource as unknown as StateStoreRoleSource)).toThrow(
      /STATE_STORE_ROLE_SOURCE_INVALID/
    );
  });

  it('rejects null sources', () => {
    expect(() => bindStateStoreRoles(null as never)).toThrow(/STATE_STORE_ROLE_SOURCE_INVALID/);
  });
});
