import { describe, expect, it } from 'vitest';

import { TransformDataSampleResponseSchema } from '../src/contracts/canvas/TransformDataSample.v1.js';
import { WorkspaceDbtModelReferenceSchema } from '../src/contracts/planner/WorkspaceDbtModelReference.v1.js';
import { WorkspaceGraphAuthoringNodeSchema } from '../src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.js';

const reference = {
  schemaVersion: 'workspace-dbt-model-reference.v1',
  canvasId: 'file-canvas',
  uniqueId: 'model.demo.clientes',
  relationId: 'assigned-relation',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    provider: 'postgres',
    connectionId: 'warehouse',
  },
  fields: [{ fieldId: 'assigned-client', name: 'client_id', dataType: 'text', nullable: true }],
};
describe('file-model reference identity', () => {
  it.each([
    { sql: 'select 1' },
    { config: { sql: 'select 1' } },
    { transformAuthoring: {} },
    { dbt: {} },
  ])('rejects competing node authority outside the typed reference: %j', (metadata) => {
    expect(
      WorkspaceGraphAuthoringNodeSchema.safeParse({
        id: 'model',
        name: 'Model',
        pluginId: 'dvt',
        kind: 'transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        metadata: { dbtModelReference: reference, ...metadata },
      }).success
    ).toBe(false);
  });
  it('retains assigned identity without SQL, credentials or an inferred physical table', () => {
    expect(WorkspaceDbtModelReferenceSchema.parse(reference)).toEqual(reference);
  });
  it('requires truthful dependency provenance for a model sample with no physical source', () => {
    const sample = {
      contractVersion: 1,
      canvasId: 'native',
      transformNodeId: 'instance',
      draftRevision: 'revision',
      semanticPlanSha256: 'a'.repeat(64),
      columns: [],
      rows: [],
      limit: 5,
      truncated: false,
      provenance: {
        mode: 'live',
        sourceRefs: [],
        queriedAt: '2026-11-04T00:00:00.000Z',
        limit: 5,
        navigation: 'bounded-first-page',
      },
    };
    expect(TransformDataSampleResponseSchema.safeParse(sample).success).toBe(false);
    expect(
      TransformDataSampleResponseSchema.safeParse({
        ...sample,
        provenance: {
          ...sample.provenance,
          modelRefs: [
            {
              canvasId: reference.canvasId,
              uniqueId: reference.uniqueId,
              contentSetSha256: 'b'.repeat(64),
              analysisSha256: 'c'.repeat(64),
            },
          ],
        },
      }).success
    ).toBe(true);
  });
  it.each([
    { uniqueId: 'source.demo.raw.client' },
    { canvasId: '' },
    { fields: [] },
    { fields: [{ ...reference.fields[0], nullable: false }] },
    { fields: [...reference.fields, reference.fields[0]] },
    { fields: [...reference.fields, { ...reference.fields[0], name: 'other' }] },
    { fields: [...reference.fields, { ...reference.fields[0], fieldId: 'other' }] },
    { compiledSql: 'select * from raw.client' },
    { credentialRef: 'env:SECRET' },
  ])('rejects a malformed or competing reference: %j', (patch) => {
    expect(WorkspaceDbtModelReferenceSchema.safeParse({ ...reference, ...patch }).success).toBe(
      false
    );
  });
});
