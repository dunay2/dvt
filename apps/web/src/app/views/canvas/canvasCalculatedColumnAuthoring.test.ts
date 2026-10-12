/**
 * Owned concern: prove calculated-column commands preserve canonical identities and references.
 * @baseline ADR-0064: canonical relations, not a projection-only inspector, own semantics.
 * @decision Assert actual dependency definitions and protobuf operands after persisted reread.
 * @consequence Grouped calculations retain alias, lineage and chaining coverage without a legacy view.
 * @version 1.0.0
 */
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { resolveFunctionReference } from '@dvt/postgres-projection';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { buildDuplicateNodeCommand } from './canvasDuplicateNodeCommand';
import { encodeDvtSubstraitStructuredFieldDocument } from './canvasDvtSubstraitStructuredField';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import { applyCanvasCalculatedColumn } from './canvasCalculatedColumnAuthoring';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  readCanvasTransformDependencyModel,
  type TransformDependencyModel,
  type TransformDefinition,
} from './canvasTransformDependencyModel';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

const OPAQUE_FIELD_ID =
  /^dvt_fld_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const source: CanonicalNode = {
  id: 'orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'success',
  tags: ['source', 'raw'],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres-main',
        provider: 'postgres',
      },
      sourceObjectId: 'raw.orders',
    },
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ],
  },
};
function session(...nodes: CanonicalNode[]): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: { record: null },
    workingSet: {
      visibleNodeIds: nodes.map((node) => node.id),
      visibleEdges: [],
      pendingExplicitNodeIds: [],
    },
    draftRevision: null,
    localNodeCatalog: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}

function inspect(node: CanonicalNode): TransformDependencyModel & Readonly<{ plan: Plan }> {
  const authority = readDvtTransformAuthoringAuthority(node)!;
  const document = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  const locate = (id: string): TransformDependencyModel['root'] => indexed.index.relations.get(id)!;
  return {
    ...readCanvasTransformDependencyModel(locate(indexed.index.rootId), locate),
    plan: document.plan,
  };
}

function expectScalarReference(
  plan: Plan,
  definition: TransformDefinition,
  signature: string,
  inputId: string
): void {
  const scalar = definition.expression.rexType;
  expect(scalar.case).toBe('scalarFunction');
  if (scalar.case !== 'scalarFunction') throw new Error('Expected canonical scalar.');
  expect(resolveFunctionReference(plan, scalar.value.functionReference)).toMatchObject({
    ok: true,
    value: { urn: 'extension:io.substrait:functions_string', name: signature },
  });
  expect(scalar.value.arguments).toHaveLength(1);
  expect(scalar.value.arguments[0]!.argType).toEqual({
    case: 'value',
    value: dvtSubstraitExpression.field(definition.inputIds.indexOf(inputId)),
  });
}

function projectionTransform(
  outputs: readonly Readonly<{
    fieldId: string;
    name: string;
    sourceFieldName: string;
  }>[] = [
    { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
    { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
  ]
): CanonicalNode {
  const draft = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'orders',
      sourceRef: source.metadata?.connectedSourceRef as never,
      fields: [
        { name: 'order_id', dataType: 'integer' },
        { name: 'customer', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs,
  });
  return applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-orders',
      name: 'Transform orders',
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

describe('Canvas calculated column authoring', () => {
  it('rejects calculated output authoring on Source without mutating physical identity', async () => {
    const initial = session(source);
    const result = await applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([[source.id, source]]),
      request: { nodeId: source.id, kind: 'string-literal', alias: 'channel', value: 'web' },
    });

    expect(result).toEqual({ outcome: 'rejected', reason: 'invalid_target' });
    expect(initial.localNodeCatalog?.[source.id]).toBe(source);
    expect(source.metadata).not.toHaveProperty('transformAuthoring');
  });

  it('appends an admitted scalar function to an existing projection Transform', async () => {
    const transform = projectionTransform();
    const trim = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'trim');
    if (trim == null) throw new Error('Expected admitted TRIM capability.');
    const initial = session(source, transform);
    initial.workingSet.visibleEdges.push({ sourceId: source.id, targetId: transform.id });

    const result = await applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      request: {
        nodeId: transform.id,
        kind: 'scalar-function',
        alias: 'customer_clean',
        inputFieldId: 'output:customer',
        capabilityId: trim.capabilityId,
      },
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const replacement = result.draftSession.localNodeCatalog?.[transform.id];
    if (replacement == null) throw new Error('Expected an updated Transform.');
    const model = inspect(replacement);
    const definition = model.definitions.find(
      (entry) => entry.output?.fieldId === result.createdFieldId
    )!;
    const created = definition.output;
    expect(created?.displayName).toBe('customer_clean');
    expectScalarReference(
      model.plan,
      definition,
      trim.signature,
      model.input.fields.find((field) => field.displayName === 'customer')!.fieldId
    );
    expect(created?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(result).toMatchObject({ createdFieldId: created?.fieldId });
    expect(created?.fieldId).not.toContain('customer_clean');
  });

  it('adds a direct alias with a fresh FieldId and preserves its source mapping on reread', async () => {
    const transform = projectionTransform();
    const initial = session(source, transform);
    initial.workingSet.visibleEdges.push({ sourceId: source.id, targetId: transform.id });

    const result = await applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      request: {
        nodeId: transform.id,
        kind: 'field-ref',
        alias: 'customer_alias',
        inputFieldId: 'output:customer',
      },
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const replacement = result.draftSession.localNodeCatalog?.[transform.id];
    if (replacement == null) throw new Error('Expected an updated Transform.');
    const model = inspect(replacement);
    const outputs = model.root.fields;
    const created = outputs.at(-1);
    expect(outputs.map((output) => output.displayName)).toEqual([
      'order_id',
      'customer',
      'customer_alias',
    ]);
    const definition = model.definitions.find(
      (entry) => entry.output?.fieldId === created?.fieldId
    )!;
    const input = model.input.fields.find((field) => field.displayName === 'customer')!;
    expect(definition.expression).toEqual(
      dvtSubstraitExpression.field(definition.inputIds.indexOf(input.fieldId))
    );
    expect(definition.binding.sourceFieldId).toBe(input.fieldId);
    expect(created?.sourceFieldId).toBe(definition.binding.fieldId);
    expect(created?.fieldId).toMatch(OPAQUE_FIELD_ID);
    expect(created?.fieldId).not.toBe('output:customer');
    expect(result.createdFieldId).toBe(created?.fieldId);
  });

  it('creates a direct alias from an upstream input that is not already an output', async () => {
    const transform = projectionTransform([
      { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
    ]);
    const upstreamCustomerId = inspect(transform).input.fields.find(
      (field) => field.displayName === 'customer'
    )?.fieldId;
    if (upstreamCustomerId == null) throw new Error('Expected upstream customer FieldId.');
    const initial = session(source, transform);
    initial.workingSet.visibleEdges.push({ sourceId: source.id, targetId: transform.id });

    const result = await applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      request: {
        nodeId: transform.id,
        kind: 'field-ref',
        alias: 'customer_alias',
        inputFieldId: upstreamCustomerId,
      },
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const replacement = result.draftSession.localNodeCatalog?.[transform.id];
    if (replacement == null) throw new Error('Expected an updated Transform.');
    const model = inspect(replacement);
    expect(model.root.fields).toEqual([
      expect.objectContaining({ fieldId: 'output:order_id', displayName: 'order_id' }),
      expect.objectContaining({ fieldId: result.createdFieldId, displayName: 'customer_alias' }),
    ]);
    const definition = model.definitions.find(
      (entry) => entry.output?.fieldId === result.createdFieldId
    )!;
    expect(definition.expression).toEqual(
      dvtSubstraitExpression.field(definition.inputIds.indexOf(upstreamCustomerId))
    );
    expect(definition.binding.sourceFieldId).toBe(upstreamCustomerId);
  });

  it('applies an admitted function to an upstream input that is not already an output', async () => {
    const transform = projectionTransform([
      { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
    ]);
    const projection = inspect(transform);
    const upstreamCustomerId = projection.input.fields.find(
      (field) => field.displayName === 'customer'
    )?.fieldId;
    const upper = resolveDvtSubstraitColumnFunctions({
      dataType: 'string',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'upper');
    if (upstreamCustomerId == null || upper == null) {
      throw new Error('Expected upstream customer and admitted UPPER capability.');
    }
    const initial = session(source, transform);
    initial.workingSet.visibleEdges.push({ sourceId: source.id, targetId: transform.id });

    const result = await applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      request: {
        nodeId: transform.id,
        kind: 'scalar-function',
        alias: 'customer_upper',
        inputFieldId: upstreamCustomerId,
        capabilityId: upper.capabilityId,
      },
    });

    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    const replacement = result.draftSession.localNodeCatalog?.[transform.id];
    if (replacement == null) throw new Error('Expected an updated Transform.');
    const model = inspect(replacement);
    const definition = model.definitions.find(
      (entry) => entry.output?.fieldId === result.createdFieldId
    )!;
    expect(model.root.fields.map((field) => field.displayName)).toEqual([
      'order_id',
      'customer_upper',
    ]);
    expectScalarReference(model.plan, definition, upper.signature, upstreamCustomerId);
  });

  it('rejects a direct alias for an unknown FieldId without mutating the Transform', async () => {
    const transform = projectionTransform();
    const initial = session(source, transform);
    const result = await applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      request: {
        nodeId: transform.id,
        kind: 'field-ref',
        alias: 'missing_alias',
        inputFieldId: 'missing-field-id',
      },
    });

    expect(result).toEqual({ outcome: 'rejected', reason: 'invalid_reference' });
    expect(initial.localNodeCatalog?.[transform.id]).toBe(transform);
    expect(inspect(transform).root.fields).toHaveLength(2);
  });

  it('chains derived outputs by FieldId and rejects mutable names as identities', async () => {
    const transform = projectionTransform();
    const functions = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    });
    const trim = functions.find((candidate) => candidate.name === 'trim');
    const upper = functions.find((candidate) => candidate.name === 'upper');
    if (trim == null || upper == null) throw new Error('Expected admitted text capabilities.');
    const initial = session(source, transform);
    initial.workingSet.visibleEdges.push({ sourceId: source.id, targetId: transform.id });
    const canonicalNodesById = new Map([
      [source.id, source],
      [transform.id, transform],
    ]);

    const first = await applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById,
      request: {
        nodeId: transform.id,
        kind: 'scalar-function',
        alias: 'customer_clean',
        inputFieldId: 'output:customer',
        capabilityId: trim.capabilityId,
      },
    });
    expect(first.outcome).toBe('applied');
    if (first.outcome !== 'applied') return;

    expect(
      await applyCanvasCalculatedColumn({
        draftSession: first.draftSession,
        canonicalNodesById,
        request: {
          nodeId: transform.id,
          kind: 'scalar-function',
          alias: 'customer_by_name',
          inputFieldId: 'customer_clean',
          capabilityId: upper.capabilityId,
        },
      })
    ).toEqual({ outcome: 'rejected', reason: 'invalid_reference' });

    const second = await applyCanvasCalculatedColumn({
      draftSession: first.draftSession,
      canonicalNodesById,
      request: {
        nodeId: transform.id,
        kind: 'scalar-function',
        alias: 'customer_normalized',
        inputFieldId: first.createdFieldId,
        capabilityId: upper.capabilityId,
      },
    });
    expect(second.outcome).toBe('applied');
    if (second.outcome !== 'applied') return;
    expect(second.createdFieldId).toMatch(OPAQUE_FIELD_ID);
    expect(second.createdFieldId).not.toBe(first.createdFieldId);

    const replacement = second.draftSession.localNodeCatalog?.[transform.id];
    if (replacement == null) throw new Error('Expected an updated Transform.');
    const model = inspect(replacement);
    expect(model.root.fields.map((output) => output.displayName)).toEqual([
      'order_id',
      'customer',
      'customer_clean',
      'customer_normalized',
    ]);
    const clean = model.definitions.find(
      (entry) => entry.output?.fieldId === first.createdFieldId
    )!;
    const normalized = model.definitions.find(
      (entry) => entry.output?.fieldId === second.createdFieldId
    )!;
    expectScalarReference(
      model.plan,
      clean,
      trim.signature,
      model.input.fields.find((field) => field.displayName === 'customer')!.fieldId
    );
    expectScalarReference(model.plan, normalized, upper.signature, clean.id);
    expect(normalized.owner.inputs).toEqual([clean.owner.binding.relationId]);
  });
  it('duplicates structured semantic objects with fresh identities and intact internal references', async () => {
    const transform = projectionTransform();
    const authority = readDvtTransformAuthoringAuthority(transform)!;
    const structured = composeDvtSubstraitProjectionFields(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument),
      {
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentFieldId: 'legacy:identity',
        parentName: 'identity',
      }
    );
    const original = applyDvtSubstraitSemanticDocument(
      transform,
      encodeDvtSubstraitStructuredFieldDocument(structured)
    );
    const before = readDvtTransformAuthoringAuthority(original)!.semanticDocument;
    const duplicate = buildDuplicateNodeCommand({
      sourceNode: { id: original.id, position: { x: 0, y: 0 } },
      sourceCanonicalNode: original,
      existingNodes: [],
    }).canonicalNode;
    const copied = readDvtTransformAuthoringAuthority(duplicate)!.semanticDocument;
    expect(copied.semanticPlan).toEqual(before.semanticPlan);
    expect(readDvtTransformAuthoringAuthority(original)!.semanticDocument).toEqual(before);
    const oldRelations = new Set(before.sidecar.relations.map((relation) => relation.relationId));
    const oldFields = new Set(before.sidecar.fields.map((field) => field.fieldId));
    const newRelations = new Set(copied.sidecar.relations.map((relation) => relation.relationId));
    const newFields = new Set(copied.sidecar.fields.map((field) => field.fieldId));
    expect(newRelations.size).toBe(oldRelations.size);
    expect(newFields.size).toBe(oldFields.size);
    expect([...newRelations].some((id) => oldRelations.has(id))).toBe(false);
    expect([...newFields].some((id) => oldFields.has(id))).toBe(false);
    expect(copied.sidecar.fields.some((field) => field.parentFieldId != null)).toBe(true);
    for (const field of copied.sidecar.fields) {
      expect(field.fieldId).toMatch(OPAQUE_FIELD_ID);
      expect(newRelations.has(field.relationId)).toBe(true);
      if (field.sourceFieldId != null) expect(newFields.has(field.sourceFieldId)).toBe(true);
      if (field.parentFieldId != null) expect(newFields.has(field.parentFieldId)).toBe(true);
    }
    expect(copied.sidecar.relations.map((relation) => relation.sourceRef)).toEqual(
      before.sidecar.relations.map((relation) => relation.sourceRef)
    );
  });
  it('keeps duplicate-alias validation on Transform after removing Source authoring', async () => {
    const transform = projectionTransform();
    const initial = session(source, transform);
    initial.workingSet.visibleEdges.push({ sourceId: source.id, targetId: transform.id });

    const result = await applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([
        [source.id, source],
        [transform.id, transform],
      ]),
      request: { nodeId: transform.id, kind: 'string-literal', alias: 'customer', value: 'x' },
    });

    expect(result).toEqual({ outcome: 'rejected', reason: 'duplicate_alias' });
    expect(initial.localNodeCatalog?.[transform.id]).toBe(transform);
  });

  it('rejects timestamp and row-number calculated fields on Source', async () => {
    const initial = session(source);
    const timestamp = await applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([[source.id, source]]),
      request: {
        nodeId: source.id,
        kind: 'timestamp-literal',
        alias: 'loaded_at',
        value: '2026-09-02T12:30:00Z',
      },
    });
    const rowNumber = await applyCanvasCalculatedColumn({
      draftSession: initial,
      canonicalNodesById: new Map([[source.id, source]]),
      request: {
        nodeId: source.id,
        kind: 'row-number',
        alias: 'row_id',
        orderFieldId: 'order_id',
      },
    });

    expect(timestamp).toEqual({ outcome: 'rejected', reason: 'invalid_target' });
    expect(rowNumber).toEqual({ outcome: 'rejected', reason: 'invalid_target' });
    expect(initial.localNodeCatalog?.[source.id]).toBe(source);
  });

  it('rejects policy-invalid aliases and literals without mutating the Transform', async () => {
    const transform = projectionTransform();
    const initial = session(source, transform);
    initial.workingSet.visibleEdges.push({ sourceId: source.id, targetId: transform.id });
    const context = new Map([
      [source.id, source],
      [transform.id, transform],
    ]);

    for (const [request, reason] of [
      [
        {
          nodeId: transform.id,
          kind: 'field-ref' as const,
          alias: 'x'.repeat(257),
          inputFieldId: 'output:customer',
        },
        'invalid_alias',
      ],
      [
        {
          nodeId: transform.id,
          kind: 'string-literal' as const,
          alias: 'channel',
          value: '😀'.repeat(1025),
        },
        'invalid_literal',
      ],
    ] as const) {
      expect(
        await applyCanvasCalculatedColumn({
          draftSession: initial,
          canonicalNodesById: context,
          request,
        })
      ).toEqual({ outcome: 'rejected', reason });
      expect(initial.localNodeCatalog?.[transform.id]).toBe(transform);
    }
  });
});
