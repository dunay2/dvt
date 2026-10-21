import { describe, expect, it } from 'vitest';
import { buildDvtNode } from './DvtAuthoringFields.test-fixtures';
import {
  applyDvtSinkAuthoringMetadata,
  createDvtSinkAuthoringMetadata,
} from './canvasDvtSinkAuthoring';
import {
  applyDvtTransformAuthoringMetadata,
  createDvtTransformAuthoringMetadata,
  validateDvtTransformAuthoringMetadata,
} from './canvasDvtTransformAuthoring';

const connectionRef = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;

describe('Explicit Sink destination persistence', () => {
  it('roundtrips the explicitly confirmed connection without acquiring one from inputs', () => {
    const node = buildDvtNode('dvt:sink', { config: { schema: 'analytics', table: 'orders' } });
    const draft = createDvtSinkAuthoringMetadata(node);
    expect(draft.connectionRef).toBeUndefined();
    const saved = applyDvtSinkAuthoringMetadata(node, { ...draft, connectionRef });
    expect(createDvtSinkAuthoringMetadata(saved)).toMatchObject({
      connectionRef,
      schema: 'analytics',
      table: 'orders',
    });
    const cleared = applyDvtSinkAuthoringMetadata(saved, { ...draft, connectionRef: null });
    expect(cleared.metadata?.config).not.toHaveProperty('connectionRef');
  });

  it('preserves unsupported authored values instead of normalizing them to an executable Sink', () => {
    const node = buildDvtNode('dvt:sink', {
      config: { materialization: 'unrecognized', writeMode: 'unrecognized' },
    });
    expect(createDvtSinkAuthoringMetadata(node)).toMatchObject({
      materialization: 'unrecognized',
      writeMode: 'unrecognized',
    });
  });

  it('persists ephemeral disposition but rejects a competing durable result target', () => {
    const node = buildDvtNode('dvt:transform', { config: { materialized: 'ephemeral' } });
    const draft = createDvtTransformAuthoringMetadata(node);
    expect(draft.materialized).toBe('ephemeral');
    expect(applyDvtTransformAuthoringMetadata(node, draft).metadata?.config).toMatchObject({
      materialized: 'ephemeral',
    });
    const conflict = {
      ...draft,
      resultTarget: {
        schemaVersion: 'dvt-transform-result-target.v1' as const,
        connectionRef,
        schema: 'analytics',
        relation: 'orders',
      },
    };
    expect(validateDvtTransformAuthoringMetadata(conflict)).toHaveProperty('materialization');
    expect(applyDvtTransformAuthoringMetadata(node, conflict)).toBe(node);
  });
});
