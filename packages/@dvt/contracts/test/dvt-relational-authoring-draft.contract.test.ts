import { describe, expect, it } from 'vitest';

import {
  DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY,
  DvtRelationalAuthoringDraftV1Schema,
  WorkspaceGraphAuthoringDraftSchema,
} from '../src/index.js';

const source = {
  relationId: 'relation:customers',
  sourceNodeId: 'customers',
  displayName: 'customers',
  fieldIds: ['field:customer-id'],
};
const operation = {
  relationId: 'relation:join',
  operation: 'inner_join' as const,
  inputs: [source.relationId, null],
};
const relationalDraft = {
  version: 'v1' as const,
  sources: [source],
  operations: [operation],
  outputRelationId: null,
  positions: {
    [source.relationId]: { x: 20, y: 40 },
    [operation.relationId]: { x: 280, y: 40 },
  },
};

function workspace(value: unknown) {
  return {
    canvas: { kind: 'transformation', title: 'Canvas' },
    nodeIds: ['model'],
    nodePositions: { model: { x: 0, y: 0 } },
    nodes: [
      {
        id: 'model',
        name: 'Model',
        pluginId: 'dvt',
        kind: 'transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        metadata: { [DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY]: value },
      },
    ],
    edges: [],
  };
}

describe('DVT relational authoring draft v1', () => {
  it('persists incomplete ports and layout without a semantic document', () => {
    expect(DvtRelationalAuthoringDraftV1Schema.parse(relationalDraft)).toEqual(relationalDraft);
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(workspace(relationalDraft)).success).toBe(
      true
    );
  });

  it('rejects duplicate identities and operation cycles', () => {
    expect(
      DvtRelationalAuthoringDraftV1Schema.safeParse({
        ...relationalDraft,
        operations: [
          { relationId: 'a', operation: 'filter', inputs: ['b'] },
          { relationId: 'b', operation: 'aggregate', inputs: ['a'] },
        ],
      }).success
    ).toBe(false);
    expect(
      DvtRelationalAuthoringDraftV1Schema.safeParse({
        ...relationalDraft,
        sources: [source, source],
      }).success
    ).toBe(false);
  });

  it('enforces operation arity independently from gesture order', () => {
    expect(
      DvtRelationalAuthoringDraftV1Schema.safeParse({
        ...relationalDraft,
        operations: [{ ...operation, inputs: [source.relationId] }],
      }).success
    ).toBe(false);
    expect(
      DvtRelationalAuthoringDraftV1Schema.safeParse({
        ...relationalDraft,
        operations: [{ relationId: 'filter', operation: 'filter', inputs: [null, null] }],
      }).success
    ).toBe(false);
  });

  it('rejects malformed draft metadata at the saved workspace boundary', () => {
    expect(
      WorkspaceGraphAuthoringDraftSchema.safeParse(
        workspace({ ...relationalDraft, version: 'future' })
      ).success
    ).toBe(false);
  });

  it('rejects relational authoring metadata on non-DVT nodes', () => {
    const value = workspace(relationalDraft);
    value.nodes[0]!.pluginId = 'dbt';
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(value).success).toBe(false);
  });
});
