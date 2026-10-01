import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { toBinary } from '@bufbuild/protobuf';
import { sha256Hex } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import {
  DVT_RELATIONAL_AUTHORING_DRAFT_METADATA_KEY,
  DvtRelationalAuthoringDraftV1Schema,
  WorkspaceGraphAuthoringDraftSchema,
  decodeDvtSubstraitPlanV1,
} from '../src/index.js';

import { buildDvtSubstraitSemanticDocumentFixture } from './fixtures/dvtSubstraitSemanticDocument.js';

const sourceDocument = buildDvtSubstraitSemanticDocumentFixture();
const sourcePlan = decodeDvtSubstraitPlanV1(sourceDocument);
const sourceRoot = sourcePlan.relations[0]!.relType;
if (sourceRoot.case !== 'root' || sourceRoot.value.input?.relType.case !== 'project')
  throw new Error('Expected the canonical projection fixture.');
sourceRoot.value.input = sourceRoot.value.input.relType.value.input;
const sourceBytes = toBinary(PlanSchema, sourcePlan);
sourceDocument.semanticPlan.bytesBase64 = Buffer.from(sourceBytes).toString('base64');
sourceDocument.semanticPlan.sha256 = sha256Hex(sourceBytes);
sourceDocument.sidecar.semanticPlanSha256 = sourceDocument.semanticPlan.sha256;
sourceDocument.sidecar.relations = [sourceDocument.sidecar.relations[0]!];
sourceDocument.sidecar.relations[0]!.sourceRef = {
  schemaVersion: 'connected-source-ref.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse',
    provider: 'postgres',
  },
  sourceObjectId: 'public.customers',
};
sourceDocument.sidecar.fields = sourceDocument.sidecar.fields.map((field) => ({
  ...field,
  relationId: 'relation:source-node',
}));
const source = {
  relationId: 'relation:source-node',
  sourceNodeId: 'customers',
  displayName: 'customers',
  semanticDocument: sourceDocument,
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

function workspace(value: unknown): { nodes: { pluginId: string }[]; [key: string]: unknown } {
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
  describe.each(['physical', 'producer'] as const)('%s pending Read coverage', (kind) => {
    it.each(['complete', 'missing', 'duplicate-position', 'out-of-range', 'wrong-parent'] as const)(
      'validates %s field identities at both persisted boundaries',
      (fault) => {
        const draft = globalThis.structuredClone(relationalDraft);
        const document = draft.sources[0]!.semanticDocument;
        const fields = document.sidecar.fields;
        if (fault === 'missing') fields.pop();
        if (fault === 'duplicate-position') fields[1]!.outputOrdinal = 0;
        if (fault === 'out-of-range') fields[2]!.outputOrdinal = 3;
        if (fault === 'wrong-parent') fields[1]!.parentFieldId = fields[0]!.fieldId;
        if (kind === 'producer') {
          const relation = document.sidecar.relations[0]!;
          delete relation.sourceRef;
          relation.producerRef = {
            nodeId: source.sourceNodeId,
            fields: fields.map((field) => ({
              fieldId: field.fieldId,
              producerFieldId: `producer:${field.fieldId}`,
            })),
          };
        }
        fields.reverse();
        expect(DvtRelationalAuthoringDraftV1Schema.safeParse(draft).success).toBe(
          fault === 'complete'
        );
        expect(WorkspaceGraphAuthoringDraftSchema.safeParse(workspace(draft)).success).toBe(
          fault === 'complete'
        );
      }
    );
  });

  it('accepts layout-only state without a terminal snapshot at the workspace boundary', () => {
    const layout = {
      version: 'v1',
      sources: [],
      operations: [],
      positions: relationalDraft.positions,
    };
    expect(DvtRelationalAuthoringDraftV1Schema.parse(layout)).toEqual(layout);
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(workspace(layout)).success).toBe(true);
  });

  it.each([
    { sources: [source], operations: [] },
    { sources: [], operations: [operation] },
  ])('rejects absent terminal intent while work is pending: %j', (pending) => {
    expect(
      DvtRelationalAuthoringDraftV1Schema.safeParse({
        version: 'v1',
        ...pending,
        positions: {},
      }).success
    ).toBe(false);
  });

  it.each([
    { x: -1, y: 0 },
    { x: 0, y: Infinity },
    { x: NaN, y: 0 },
  ])('rejects invalid layout-only coordinates %j', (position) => {
    expect(
      DvtRelationalAuthoringDraftV1Schema.safeParse({
        version: 'v1',
        sources: [],
        operations: [],
        positions: { card: position },
      }).success
    ).toBe(false);
  });
  it('reports corrupt source bytes as validation errors rather than throwing', () => {
    const bytes = Uint8Array.from([255]);
    const digest = sha256Hex(bytes);
    const document = {
      ...sourceDocument,
      semanticPlan: {
        ...sourceDocument.semanticPlan,
        bytesBase64: Buffer.from(bytes).toString('base64'),
        sha256: digest,
      },
      sidecar: { ...sourceDocument.sidecar, semanticPlanSha256: digest },
    };
    expect(
      DvtRelationalAuthoringDraftV1Schema.safeParse({
        ...relationalDraft,
        sources: [{ ...source, semanticDocument: document }],
      }).success
    ).toBe(false);
  });
  it('rejects positional snapshots and sources that copy producer operators', () => {
    expect(
      DvtRelationalAuthoringDraftV1Schema.safeParse({
        ...relationalDraft,
        sources: [
          {
            relationId: source.relationId,
            sourceNodeId: source.sourceNodeId,
            displayName: source.displayName,
            fieldIds: ['former-positional-id'],
          },
        ],
      }).success
    ).toBe(false);
    expect(
      DvtRelationalAuthoringDraftV1Schema.safeParse({
        ...relationalDraft,
        sources: [{ ...source, semanticDocument: buildDvtSubstraitSemanticDocumentFixture() }],
      }).success
    ).toBe(false);
    expect(
      DvtRelationalAuthoringDraftV1Schema.safeParse({
        ...relationalDraft,
        sources: [{ ...source, relationId: 'foreign-relation' }],
      }).success
    ).toBe(false);
  });
  it('persists incomplete ports and layout without a semantic document', () => {
    expect(DvtRelationalAuthoringDraftV1Schema.parse(relationalDraft)).toEqual(relationalDraft);
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(workspace(relationalDraft)).success).toBe(
      true
    );
  });

  it('retains applied relation positions without duplicating them as draft nodes', () => {
    const layoutOnly = {
      ...relationalDraft,
      sources: [],
      operations: [],
      outputRelationId: operation.relationId,
    };
    expect(DvtRelationalAuthoringDraftV1Schema.parse(layoutOnly)).toEqual(layoutOnly);
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

  it('accepts semantic authoring for a fully connected Transform operation', () => {
    const semanticDocument = buildDvtSubstraitSemanticDocumentFixture();
    const configured = {
      ...relationalDraft,
      operations: [
        {
          relationId: 'relation:transform-node:project',
          operation: 'field_transform' as const,
          inputs: ['relation:source-node'],
          semanticDocument,
        },
      ],
    };
    expect(DvtRelationalAuthoringDraftV1Schema.safeParse(configured).success).toBe(true);
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
