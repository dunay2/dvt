import { rebindDvtSubstraitSemanticSourceRefV1 } from '@dvt/contracts';

import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { readCanvasColumnMappingInputFields } from './canvasColumnProjectionAuthority';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputSlots, type RelationOutputSlot } from './canvasRelationOutputSchema';
import { relationOutputIntent } from './canvasRelationOutputIntent';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';

const sourceRef = {
  schemaVersion: 'connected-source-ref.v1' as const,
  connectionRef: {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'warehouse-main',
    provider: 'postgres' as const,
  },
  sourceObjectId: 'raw.orders',
};

function sourceNode(): CanonicalNode {
  return {
    id: 'source-orders',
    name: 'orders',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      connectedSourceRef: sourceRef,
      schema: 'raw',
      tableName: 'orders',
      columns: [
        { name: 'order_id', type: 'integer' },
        { name: 'customer', type: 'text' },
      ],
    },
  };
}

function targetNode(): CanonicalNode {
  return {
    id: 'transform-orders',
    name: 'Orders transform',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

function identitySnapshot(node: CanonicalNode): Readonly<{
  sourceRelationId: string;
  targetRelationId: string;
  sourceFieldIds: readonly string[];
}> {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) throw new Error('Expected Transform authoring authority.');
  const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  const sourceRelation = draft.sidecar.relations.find((relation) => relation.sourceRef != null);
  const targetRelation = draft.sidecar.relations.find((relation) => relation.sourceRef == null);
  if (sourceRelation == null || targetRelation == null)
    throw new Error('Expected projection relations.');
  return {
    sourceRelationId: sourceRelation.relationId,
    targetRelationId: targetRelation.relationId,
    sourceFieldIds: draft.sidecar.fields
      .filter((field) => field.relationId === sourceRelation.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
      .map((field) => field.fieldId),
  };
}

function explicitProjection(): Readonly<{
  source: CanonicalNode;
  target: CanonicalNode;
  draft: ReturnType<typeof createDvtSubstraitProjectionDraft>;
}> {
  const source = sourceNode();
  const target = targetNode();
  const draft = createDvtSubstraitProjectionDraft({
    source: resolveDvtSubstraitProjectionSource(source)!,
    targetNodeId: target.id,
    outputs: [
      { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
      { fieldId: 'output:customer', name: 'buyer', sourceFieldName: 'customer' },
    ],
  });
  return {
    source,
    draft,
    target: applyDvtSubstraitSemanticDocument(target, encodeDvtSubstraitSemanticDocument(draft)),
  };
}
async function publishedSlots(
  session: CanvasRelationAnalysisSession
): Promise<readonly RelationOutputSlot[]> {
  const root = session.locate(session.rootId, session.revision);
  return relationOutputSlots(root, await Promise.all(root.inputs.map((id) => session.query(id))));
}

describe('Canvas explicit projection identity persistence', () => {
  it('keeps relation and input/output FieldIds stable through the shared alias command', async () => {
    const { target, draft } = explicitProjection();
    const before = identitySnapshot(target);
    const session = new CanvasRelationAnalysisSession(target.id);
    session.receive(draft);
    const slots = await publishedSlots(session);
    const edited = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: slots
        .filter((slot) => slot.output != null)
        .map((slot) => ({
          slot: slot.slot,
          alias: slot.output!.fieldId === 'output:customer' ? 'customer_name' : slot.name,
        })),
    });
    const node = applyDvtSubstraitSemanticDocument(
      target,
      encodeDvtSubstraitSemanticDocument(edited)
    );
    expect(identitySnapshot(node)).toEqual(before);
    expect(edited.sidecar.fields.map((field) => field.fieldId).sort()).toEqual(
      draft.sidecar.fields.map((field) => field.fieldId).sort()
    );
    expect(
      edited.sidecar.fields.find((field) => field.fieldId === 'output:customer')?.displayName
    ).toBe('customer_name');
    session.dispose();
  });

  it('rejects display names at the FieldId command boundary without modifying authority', async () => {
    const { target, draft } = explicitProjection();
    const session = new CanvasRelationAnalysisSession(target.id);
    session.receive(draft);
    const slots = await publishedSlots(session);
    const before = await session.query(session.rootId);
    expect(() =>
      relationOutputIntent(slots, { nodeId: target.id, columnId: 'buyer', output: false })
    ).toThrow(/outside the selected output/);
    expect(
      relationOutputIntent(slots, { nodeId: target.id, columnId: 'output:customer', output: false })
    ).toEqual([
      {
        slot: slots.find((slot) => slot.output?.fieldId === 'output:order_id')!.slot,
        alias: 'order_id',
      },
    ]);
    expect(await session.query(session.rootId)).toEqual(before);
    session.dispose();
  });

  it('reopens a Transform after a compatible Source schema rebind without reallocating identities', () => {
    const { source, target } = explicitProjection();
    const before = identitySnapshot(target);
    const authority = readDvtTransformAuthoringAuthority(target)!;
    const reboundSourceRef = {
      ...sourceRef,
      connectionRef: { ...sourceRef.connectionRef, connectionId: 'warehouse-recovery' },
      sourceObjectId: 'archive.orders',
    };
    const reboundTarget = applyDvtSubstraitSemanticDocument(
      target,
      rebindDvtSubstraitSemanticSourceRefV1(authority.semanticDocument, sourceRef, reboundSourceRef)
    );
    const reboundSource: CanonicalNode = {
      ...source,
      metadata: { ...source.metadata, connectedSourceRef: reboundSourceRef, schema: 'archive' },
    };
    const fields = readCanvasColumnMappingInputFields({
      sourceNode: reboundTarget,
      edges: [{ sourceId: reboundSource.id, targetId: reboundTarget.id }],
      resolveNode: (id) => [reboundSource, reboundTarget].find((node) => node.id === id),
    });
    expect(fields.map((field) => ({ columnId: field.columnId, name: field.name }))).toEqual([
      { columnId: 'output:order_id', name: 'order_id' },
      { columnId: 'output:customer', name: 'buyer' },
    ]);
    expect(identitySnapshot(reboundTarget)).toEqual(before);
  });
});
