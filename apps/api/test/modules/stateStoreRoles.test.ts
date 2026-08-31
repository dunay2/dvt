import { describe, expect, it } from 'vitest';

import type { StateStoreRoleSource } from '../../src/modules/stateStoreRoles.js';
import { bindStateStoreRoles } from '../../src/modules/stateStoreRoles.js';

function createStateStoreSource(): StateStoreRoleSource {
  return {
    bootstrapRunTx: async () => null as never,
    bootstrapRecoveryRunTx: async () => null as never,
    appendAndEnqueueTx: async () => null as never,
    saveProviderRef: async () => null as never,
    getRunMetadataByRunId: async () => null as never,
    hasEventByIdempotencyKey: async () => false,
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

  it('marks the bundle as a root-owned boundary value without widening public role keys', () => {
    const source = createStateStoreSource();

    const bindings = bindStateStoreRoles(source);
    const brandSymbols = Object.getOwnPropertySymbols(bindings);

    expect(brandSymbols).toHaveLength(1);
    const [brandSymbol] = brandSymbols;
    if (brandSymbol === undefined) {
      throw new Error('Expected state-store role bundle brand symbol');
    }
    expect(String(brandSymbol)).toContain('StateStoreRoleBindings');
    expect(Object.keys(bindings)).toEqual(['read', 'write', 'maintenance', 'snapshotStaleness']);
    expect(Object.getOwnPropertyDescriptor(bindings, brandSymbol)?.enumerable).toBe(false);
  });

  it.each([
    ['bootstrapRunTx', 'read bootstrap role'],
    ['bootstrapRecoveryRunTx', 'recovery bootstrap role'],
    ['appendAndEnqueueTx', 'write append role'],
    ['hasEventByIdempotencyKey', 'read event existence role'],
    ['rebuildSnapshot', 'maintenance rebuild role'],
    ['isSnapshotStale', 'snapshot staleness role'],
  ] as const)('rejects a source missing %s for the %s', (methodName, _roleLabel) => {
    const partialSource = {
      bootstrapRunTx: async () => null as never,
      bootstrapRecoveryRunTx: async () => null as never,
      appendAndEnqueueTx: async () => null as never,
      saveProviderRef: async () => null as never,
      getRunMetadataByRunId: async () => null as never,
      hasEventByIdempotencyKey: async () => false,
      listEvents: async () => [],
      listRuns: async () => [],
      getSnapshot: async () => null as never,
      rebuildSnapshot: async () => null as never,
      isSnapshotStale: async () => false,
    };
    delete partialSource[methodName];

    expect(() => bindStateStoreRoles(partialSource as unknown as StateStoreRoleSource)).toThrow(
      new RegExp(`STATE_STORE_ROLE_SOURCE_INVALID: missing function ${methodName}`)
    );
  });

  it('rejects a source when a required role member is not a function', () => {
    const invalidSource = {
      ...createStateStoreSource(),
      rebuildSnapshot: 'not-a-function',
    };

    expect(() => bindStateStoreRoles(invalidSource as unknown as StateStoreRoleSource)).toThrow(
      /STATE_STORE_ROLE_SOURCE_INVALID: missing function rebuildSnapshot/
    );
  });

  it('rejects null sources', () => {
    expect(() => bindStateStoreRoles(null as never)).toThrow(/STATE_STORE_ROLE_SOURCE_INVALID/);
  });
});
