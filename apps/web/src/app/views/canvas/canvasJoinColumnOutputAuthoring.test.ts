import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  reorderCanvasColumnOutput,
  setCanvasColumnOutputIncluded,
} from './canvasColumnOutputAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  appendDvtSubstraitInnerJoinInput,
  createDvtSubstraitInnerJoinDraft,
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
  type DvtSubstraitJoinSource,
  type DvtSubstraitNInputJoinProjection,
} from './canvasDvtSubstraitJoinComposition';
import { readCanvasJoinColumnOutputs } from './canvasJoinColumnOutputModel';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';

function source(table: string): DvtSubstraitJoinSource {
  return {
    nodeId: table,
    schema: 'raw',
    table,
    sourceRef: {
      schemaVersion: 'connected-source-ref.v1' as const,
      sourceObjectId: `raw.${table}`,
      connectionRef: {
        schemaVersion: 'connection-ref.v1' as const,
        connectionId: 'postgres-main',
        provider: 'postgres' as const,
      },
    },
  };
}

function fixture(sourceCount: number): {
  node: CanonicalNode;
  session: CanvasDraftSession;
  nodes: Map<string, CanonicalNode>;
} {
  let draft = createDvtSubstraitInnerJoinDraft({
    left: source('customers'),
    right: source('orders'),
    targetNodeId: 'joined',
  });
  if (sourceCount === 3) {
    const inspected = inspectDvtSubstraitNInputJoinDraft(draft);
    if (!inspected.ok) throw new Error('Expected JOIN fixture.');
    draft = appendDvtSubstraitInnerJoinInput(draft, {
      source: source('details'),
      fields: ['order_id', 'product'],
      selectedFields: ['product'],
      predicate: {
        leftSourceFieldId: inspected.projection.outputs.find((field) => field.name === 'order_id')!
          .source.fieldId,
        rightFieldName: 'order_id',
      },
    });
  }
  const node = applyDvtSubstraitSemanticDocument(
    {
      id: 'joined',
      name: 'Joined',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
    encodeDvtSubstraitInnerJoinDocument(draft)
  );
  const session: CanvasDraftSession = {
    syncState: 'editing',
    baseline: { record: null },
    draftRevision: 'rev-1',
    workingSet: { visibleNodeIds: [node.id], visibleEdges: [], pendingExplicitNodeIds: [] },
    localNodeCatalog: { [node.id]: node },
  };
  return { node, session, nodes: new Map([[node.id, node]]) };
}

function inspect(node: CanonicalNode): DvtSubstraitNInputJoinProjection {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) throw new Error('Expected semantic authority.');
  const result = inspectDvtSubstraitNInputJoinDraft(
    decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument)
  );
  if (!result.ok) throw new Error('Expected preserved JOIN.');
  return result.projection;
}

describe('JOIN card output selection', () => {
  it.each([2, 3])('reorders a %i-source JOIN without replacing fields or predicates', (count) => {
    const { node, session, nodes } = fixture(count);
    const before = inspect(node);
    const moved = before.outputs.at(-1)!;
    const target = before.outputs[0]!;
    const result = reorderCanvasColumnOutput({
      draftSession: session,
      canonicalNodesById: nodes,
      targetNodeId: node.id,
      columnId: moved.fieldId,
      targetColumnId: target.fieldId,
      placement: 'before',
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const after = inspect(result.draftSession.localNodeCatalog![node.id]!);
    expect(after.outputs).toEqual(
      [moved, ...before.outputs.slice(0, -1)].map((field, outputOrdinal) => ({
        ...field,
        outputOrdinal,
      }))
    );
    expect(after.inputs).toEqual(before.inputs);
    expect(after.joins).toEqual(before.joins);
    expect(after.joinRelations).toEqual(before.joinRelations);
    expect(result.draftSession.workingSet).toEqual(session.workingSet);
    const reversed = reorderCanvasColumnOutput({
      draftSession: result.draftSession,
      canonicalNodesById: nodes,
      targetNodeId: node.id,
      columnId: moved.fieldId,
      targetColumnId: before.outputs.at(-2)!.fieldId,
      placement: 'after',
    });
    expect(reversed.outcome).toBe('applied');
    if (reversed.outcome === 'applied')
      expect(inspect(reversed.draftSession.localNodeCatalog![node.id]!)).toEqual(before);
  });

  it.each([2, 3])(
    'restores an excluded field at its staged position in a %i-source JOIN',
    (count) => {
      const { node, session, nodes } = fixture(count);
      const before = inspect(node);
      const removed = before.outputs[0]!;
      const request = {
        draftSession: session,
        canonicalNodesById: nodes,
        targetNodeId: node.id,
        columnId: removed.fieldId,
        columnType: removed.dataType,
        output: false,
      };
      const excluded = setCanvasColumnOutputIncluded(request);
      if (excluded.outcome !== 'applied') throw new Error('Expected output exclusion.');
      const restored = setCanvasColumnOutputIncluded({
        ...request,
        draftSession: excluded.draftSession,
        columnId: removed.source.fieldId,
        output: true,
        placement: { targetColumnId: before.outputs[1]!.fieldId, placement: 'before' },
      });
      expect(restored.outcome).toBe('applied');
      if (restored.outcome !== 'applied') return;
      const after = inspect(restored.draftSession.localNodeCatalog![node.id]!);
      expect(after.outputs.map((field) => field.source)).toEqual(
        before.outputs.map((field) => field.source)
      );
      expect(after.outputs.slice(1)).toEqual(before.outputs.slice(1));
      expect(after.joins).toEqual(before.joins);
    }
  );

  it('rejects unknown, inactive and self reorder targets without changing authority', () => {
    const { node, session, nodes } = fixture(3);
    const entry = readCanvasJoinColumnOutputs(node)!;
    const active = entry.fields[0]!;
    const inactive = entry.fields.find((field) => !field.selected)!;
    for (const targetColumnId of ['missing', inactive.columnId, active.columnId]) {
      expect(
        reorderCanvasColumnOutput({
          draftSession: session,
          canonicalNodesById: nodes,
          targetNodeId: node.id,
          columnId: active.columnId,
          targetColumnId,
          placement: 'before',
        }).outcome
      ).toBe('rejected');
    }
    expect(
      reorderCanvasColumnOutput({
        draftSession: session,
        canonicalNodesById: nodes,
        targetNodeId: node.id,
        columnId: inactive.columnId,
        targetColumnId: active.columnId,
        placement: 'before',
      }).outcome
    ).toBe('rejected');
    expect(session.localNodeCatalog![node.id]).toBe(node);
  });

  it.each([2, 3])(
    'excludes and restores a field in a %i-source JOIN through the column command',
    (count) => {
      const { node, session, nodes } = fixture(count);
      const before = inspect(node);
      const removed = before.outputs.find((field) => field.name === 'order_id')!;
      const request = {
        draftSession: session,
        canonicalNodesById: nodes,
        targetNodeId: node.id,
        columnId: removed.fieldId,
        columnType: removed.dataType,
        output: false,
      };
      const result = setCanvasColumnOutputIncluded(request);
      expect(result.outcome).toBe('applied');
      if (result.outcome !== 'applied') return;
      const after = inspect(result.draftSession.localNodeCatalog![node.id]!);
      expect(after.outputs).toEqual(
        before.outputs
          .filter((field) => field !== removed)
          .map((field, outputOrdinal) => ({ ...field, outputOrdinal }))
      );
      expect(after.inputs).toEqual(before.inputs);
      expect(after.joins).toEqual(before.joins);
      expect(after.joinRelations).toEqual(before.joinRelations);
      expect(result.draftSession.workingSet).toEqual(session.workingSet);
      expect(inspect(node)).toEqual(before);
      const available = readCanvasJoinColumnOutputs(
        result.draftSession.localNodeCatalog![node.id]!
      )!;
      expect(
        available.fields.find((field) => field.sourceFieldId === removed.source.fieldId)
      ).toMatchObject({ columnId: removed.source.fieldId, selected: false });

      const restored = setCanvasColumnOutputIncluded({
        ...request,
        draftSession: result.draftSession,
        columnId: removed.source.fieldId,
        output: true,
      });
      expect(restored.outcome).toBe('applied');
      if (restored.outcome !== 'applied') return;
      const restoredProjection = inspect(restored.draftSession.localNodeCatalog![node.id]!);
      expect(restoredProjection.outputs.map((field) => field.name)).toContain('order_id');
      expect(
        restoredProjection.outputs.filter(
          (field) => field.source.fieldId !== removed.source.fieldId
        )
      ).toEqual(after.outputs);
      expect(restoredProjection.joins).toEqual(before.joins);
    }
  );

  it('rejects an unknown field without changing the draft', () => {
    const { node, session, nodes } = fixture(3);
    expect(
      setCanvasColumnOutputIncluded({
        draftSession: session,
        canonicalNodesById: nodes,
        targetNodeId: node.id,
        columnId: 'missing-field',
        columnType: 'string',
        output: false,
      }).outcome
    ).toBe('rejected');
    expect(session.localNodeCatalog![node.id]).toBe(node);
  });

  it('keeps the final JOIN output and fails closed on malformed or non-JOIN authority', () => {
    const { node, session, nodes } = fixture(2);
    let current = session;
    for (const field of inspect(node).outputs.slice(1)) {
      const result = setCanvasColumnOutputIncluded({
        draftSession: current,
        canonicalNodesById: nodes,
        targetNodeId: node.id,
        columnId: field.fieldId,
        columnType: field.dataType,
        output: false,
      });
      if (result.outcome !== 'applied') throw new Error('Expected output exclusion.');
      current = result.draftSession;
    }
    const remaining = inspect(current.localNodeCatalog![node.id]!).outputs[0]!;
    expect(
      setCanvasColumnOutputIncluded({
        draftSession: current,
        canonicalNodesById: nodes,
        targetNodeId: node.id,
        columnId: remaining.fieldId,
        columnType: remaining.dataType,
        output: false,
      }).outcome
    ).toBe('rejected');
    expect(
      readCanvasJoinColumnOutputs({ ...node, metadata: { transformAuthoring: {} } })
    ).toBeNull();
    expect(readCanvasJoinColumnOutputs({ ...node, metadata: {} })).toBeNull();
    expect(readCanvasJoinColumnOutputs({ ...node, pluginId: 'dbt' })).toBeNull();
  });
});
