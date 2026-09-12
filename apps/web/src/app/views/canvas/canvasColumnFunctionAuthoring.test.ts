import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasColumnFunction } from './canvasColumnFunctionAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitProjectionSemantics,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

const OPAQUE_FIELD_ID =
  /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const source: CanonicalNode = {
  id: 'source-events',
  name: 'Events',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'success',
  tags: [],
  metadata: {
    schema: 'raw',
    tableName: 'events',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'warehouse-main',
        provider: 'postgres',
      },
      sourceObjectId: 'raw.events',
    },
    columns: [
      { name: 'event_id', type: 'text' },
      { name: 'event_type', type: 'text' },
    ],
  },
};

const externalModel: CanonicalNode = {
  id: 'model-events',
  name: 'Model 2',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: ['finance'],
  metadata: {
    rowCount: 7800,
    sizeBytes: 2_600_000,
    config: { materialized: 'view' },
    dbt: {
      selectedSourceId: source.id,
      projectionColumns: [
        { name: 'event_type', output: true },
        { name: 'event_id', output: true },
      ],
    },
  },
};

function projectionTransform(): CanonicalNode {
  const draft = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'events',
      sourceRef: source.metadata?.connectedSourceRef as never,
      fields: [
        { name: 'event_id', dataType: 'text' },
        { name: 'event_type', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-events',
    outputs: [
      { fieldId: 'output:event_id', name: 'event_id', sourceFieldName: 'event_id' },
      { fieldId: 'output:event_type', name: 'event_type', sourceFieldName: 'event_type' },
    ],
  });
  return applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-events',
      name: 'Transform events',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    },
    encodeDvtSubstraitProjectionDocument(draft)
  );
}

function draftSession(...nodes: CanonicalNode[]): CanvasDraftSession {
  const transform = nodes.find((node) => node.kind === 'dvt:transform');
  return {
    syncState: 'editing',
    baseline: { record: null },
    workingSet: {
      visibleNodeIds: nodes.map((node) => node.id),
      visibleEdges: transform == null ? [] : [{ sourceId: source.id, targetId: transform.id }],
      pendingExplicitNodeIds: [],
    },
    draftRevision: null,
    localNodeCatalog: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function inspect(node: CanonicalNode): DvtSubstraitProjectionSemantics {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority?.mode !== 'substrait') throw new Error('Expected Substrait authority.');
  const inspection = inspectDvtSubstraitProjectionDraft(
    decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
  );
  if (!inspection.ok) throw new Error('Expected an inspectable projection.');
  return inspection.projection;
}

describe('Canvas column function authoring', () => {
  it('appends a binary CONCAT output and preserves reusable operands', () => {
    const transform = projectionTransform();
    const concat = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text', 'text'],
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'concat');
    if (concat == null) throw new Error('Expected admitted CONCAT capability.');
    const initial = draftSession(source, transform);
    const before = inspect(transform);
    const left = before.outputs.find((output) => output.name === 'event_id');
    const right = before.outputs.find((output) => output.name === 'event_type');
    if (left == null || right == null) throw new Error('Expected two operands.');

    const first = applyCanvasColumnFunction({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      identity: {
        nodeId: transform.id,
        operandFieldIds: [left.fieldId, right.fieldId],
        capabilityId: concat.capabilityId,
        alias: 'event_key',
      },
    });

    expect(first.outcome).toBe('applied');
    if (first.outcome !== 'applied') return;
    const firstNode = first.draftSession.localNodeCatalog?.[transform.id];
    if (firstNode == null) throw new Error('Expected updated Transform.');
    const afterFirst = inspect(firstNode);
    expect(afterFirst.outputs.slice(0, 2)).toEqual(before.outputs);
    const derived = afterFirst.outputs.find((output) => output.name === 'event_key');
    expect(derived?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(derived?.scalarExpression).toEqual({
      kind: 'scalar-function',
      functionName: 'concat',
      arguments: [
        { kind: 'field-reference', sourceFieldName: 'event_id' },
        { kind: 'field-reference', sourceFieldName: 'event_type' },
      ],
      nullHandling: 'ACCEPT_NULLS',
    });

    const second = applyCanvasColumnFunction({
      draftSession: first.draftSession,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      identity: {
        nodeId: transform.id,
        operandFieldIds: [derived!.fieldId, right.fieldId],
        capabilityId: concat.capabilityId,
        alias: 'event_key_extended',
      },
    });
    expect(second.outcome).toBe('applied');
    if (second.outcome !== 'applied') return;
    const secondNode = second.draftSession.localNodeCatalog?.[transform.id];
    if (secondNode == null) throw new Error('Expected recursively updated Transform.');
    expect(
      inspect(secondNode).outputs.find((output) => output.name === 'event_key_extended')
    ).toMatchObject({
      scalarExpression: {
        kind: 'scalar-function',
        functionName: 'concat',
        nullHandling: 'ACCEPT_NULLS',
      },
    });
  });

  it('derives a new unary output from a card function without mutating the selected output', () => {
    const transform = projectionTransform();
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'trim');
    if (trim == null) throw new Error('Expected admitted TRIM capability.');
    const initial = draftSession(source, transform);
    const before = inspect(transform);
    const selectedBefore = before.outputs.find((output) => output.name === 'event_type');
    if (selectedBefore == null) throw new Error('Expected event_type output.');

    const result = applyCanvasColumnFunction({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      identity: {
        nodeId: transform.id,
        operandFieldIds: [selectedBefore.fieldId],
        capabilityId: trim.capabilityId,
        alias: 'event_type_clean',
      },
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const replacement = result.draftSession.localNodeCatalog?.[transform.id];
    if (replacement == null) throw new Error('Expected updated Transform.');
    const after = inspect(replacement);
    expect(after.outputs).toHaveLength(before.outputs.length + 1);
    expect(after.outputs.find((output) => output.fieldId === selectedBefore.fieldId)).toEqual(
      selectedBefore
    );
    const created = after.outputs.find((output) => output.name === 'event_type_clean');
    expect(created).toMatchObject({
      sourceFieldName: 'event_type',
      operations: ['trim'],
    });
    expect(created?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(created?.fieldId).not.toBe(selectedBefore.fieldId);
    expect(created?.fieldId).not.toContain('event_type_clean');
  });

  it('rejects duplicate aliases without mutating the selected output', () => {
    const transform = projectionTransform();
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'trim');
    if (trim == null) throw new Error('Expected admitted TRIM capability.');
    const initial = draftSession(source, transform);
    const selected = inspect(transform).outputs.find((output) => output.name === 'event_type');
    if (selected == null) throw new Error('Expected event_type output.');

    const result = applyCanvasColumnFunction({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      identity: {
        nodeId: transform.id,
        operandFieldIds: [selected.fieldId],
        capabilityId: trim.capabilityId,
        alias: 'event_type',
      },
    });

    expect(result).toEqual({ outcome: 'rejected' });
    expect(initial.localNodeCatalog?.[transform.id]).toBe(transform);
  });

  it('rejects a function on an external DBT model without changing its identity or authority', () => {
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'trim');
    if (trim == null) throw new Error('Expected admitted TRIM capability.');

    const initial = draftSession(source, externalModel);
    const result = applyCanvasColumnFunction({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [externalModel.id, externalModel],
      ]),
      identity: {
        nodeId: externalModel.id,
        operandFieldIds: ['event_type'],
        capabilityId: trim.capabilityId,
        alias: 'event_type_clean',
      },
    });

    expect(result).toEqual({ outcome: 'rejected' });
    expect(initial.localNodeCatalog?.[externalModel.id]).toBe(externalModel);
  });
  it('appends one variadic COALESCE output from ordered reusable FieldIds', () => {
    const transform = projectionTransform();
    const functions = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
      resolution: 'proposal',
    });
    const trim = functions.find((candidate) => candidate.name === 'trim');
    const coalesce = functions.find((candidate) => candidate.name === 'coalesce');
    if (trim == null || coalesce == null) {
      throw new Error('Expected admitted TRIM and COALESCE capabilities.');
    }
    const initial = draftSession(source, transform);
    const before = inspect(transform);
    const eventId = before.outputs.find((output) => output.name === 'event_id');
    const eventType = before.outputs.find((output) => output.name === 'event_type');
    if (eventId == null || eventType == null) throw new Error('Expected base operands.');

    const trimmed = applyCanvasColumnFunction({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      identity: {
        nodeId: transform.id,

        operandFieldIds: [eventType.fieldId],
        capabilityId: trim.capabilityId,
        alias: 'event_type_clean',
      },
    });
    if (trimmed.outcome !== 'applied') throw new Error('Expected reusable derived output.');

    expect(
      applyCanvasColumnFunction({
        draftSession: trimmed.draftSession,
        canonicalNodesById: new Map([
          [source.id, source],
          [transform.id, transform],
        ]),
        identity: {
          nodeId: transform.id,

          operandFieldIds: [eventId.fieldId],
          capabilityId: coalesce.capabilityId,
          alias: 'preferred_event',
        },
      })
    ).toEqual({ outcome: 'rejected' });

    const composed = applyCanvasColumnFunction({
      draftSession: trimmed.draftSession,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      identity: {
        nodeId: transform.id,

        operandFieldIds: [eventId.fieldId, eventType.fieldId, trimmed.createdFieldId],
        capabilityId: coalesce.capabilityId,
        alias: 'preferred_event',
      },
    });
    if (composed.outcome !== 'applied') throw new Error('Expected COALESCE output.');
    const nextNode = composed.draftSession.localNodeCatalog?.[transform.id];
    if (nextNode == null) throw new Error('Expected updated Transform.');
    const after = inspect(nextNode);

    expect(after.outputs).toHaveLength(before.outputs.length + 2);
    expect(after.outputs.slice(0, before.outputs.length)).toEqual(before.outputs);
    expect(after.outputs.find((output) => output.name === 'preferred_event')).toMatchObject({
      fieldId: composed.createdFieldId,
      operandFieldIds: [eventId.fieldId, eventType.fieldId, trimmed.createdFieldId],
      scalarExpression: {
        kind: 'scalar-function',
        functionName: 'coalesce',
      },
    });
  });
});
