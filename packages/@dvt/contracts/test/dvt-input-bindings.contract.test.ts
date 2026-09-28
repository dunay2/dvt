import { describe, expect, it } from 'vitest';

import { DvtInputBindingsV1Schema, WorkspaceGraphAuthoringDraftSchema } from '../src/index.js';

const field = { inputId: 'consumer-input', producerFieldId: 'published-field' };
const source = {
  id: 'producer',
  name: 'Producer',
  pluginId: 'dvt',
  kind: 'source',
  role: 'input',
  status: 'idle',
  tags: [],
};
const target = {
  ...source,
  id: 'consumer',
  name: 'Consumer',
  kind: 'transform',
  role: 'transform',
};
const edge = { id: 'dependency', sourceId: source.id, targetId: target.id, relation: 'lineage' };
function draft(inputBindings: unknown): {
  canvas: { kind: string; title: string };
  nodeIds: string[];
  nodePositions: Record<string, { x: number; y: number }>;
  nodes: (typeof source)[];
  edges: Array<typeof edge & { metadata: { inputBindings: unknown } }>;
} {
  return {
    canvas: { kind: 'transformation', title: 'Canvas' },
    nodeIds: [source.id, target.id],
    nodePositions: { producer: { x: 0, y: 0 }, consumer: { x: 1, y: 1 } },
    nodes: [source, target],
    edges: [{ ...edge, metadata: { inputBindings } }],
  };
}

describe('DVT input provenance bindings', () => {
  it('persists incomplete input wiring without a semantic document', () => {
    const value = draft({ version: 'v1', fields: [field] });
    expect(WorkspaceGraphAuthoringDraftSchema.parse(JSON.parse(JSON.stringify(value)))).toEqual(
      value
    );
  });
  it.each([
    { version: 'future', fields: [field] },
    { version: 'v1', fields: [{ ...field, inputId: ' ' }] },
    { version: 'v1', fields: [field, field] },
    { version: 'v1', fields: [field, { ...field, inputId: 'another-slot' }] },
    { version: 'v1', fields: [{ ...field, expression: 'not allowed' }] },
  ])('rejects malformed or duplicate wiring: %o', (value) => {
    expect(DvtInputBindingsV1Schema.safeParse(value).success).toBe(false);
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(draft(value)).success).toBe(false);
  });
  it('allows no fields without deleting the producer dependency', () => {
    expect(
      WorkspaceGraphAuthoringDraftSchema.safeParse(draft({ version: 'v1', fields: [] })).success
    ).toBe(true);
  });
  it('rejects two producers binding the same consumer input slot', () => {
    const value = draft({ version: 'v1', fields: [field] });
    const other = { ...source, id: 'other' };
    value.nodes.push(other);
    value.nodeIds.push(other.id);
    Object.assign(value.nodePositions, { other: { x: 2, y: 2 } });
    value.edges.push({
      ...edge,
      id: 'other-edge',
      sourceId: other.id,
      metadata: { inputBindings: { version: 'v1', fields: [field] } },
    });
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(value).success).toBe(false);
  });
});
