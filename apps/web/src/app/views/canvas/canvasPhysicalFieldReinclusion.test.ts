/** Regression for physical output selection beside calculated expressions. */
import { describe, expect, it } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { applyCanvasRelationOutput } from './canvasRelationOutputAuthoring';
import { createDvtSubstraitProjectionOutput } from './canvasLegacyProjectionOutput.test-support';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

async function fixture(
  withLiteral = false,
  physicalAlias = 'customer'
): Promise<{
  source: CanonicalNode;
  model: CanonicalNode;
  session: CanvasDraftSession;
  hidden: CanvasDraftSession;
  inputId: string;
  toggle: (
    current: CanvasDraftSession,
    columnId: string,
    output: boolean,
    placement?: Readonly<{ targetColumnId: string; placement: 'before' | 'after' }>
  ) => ReturnType<typeof applyCanvasRelationOutput>;
}> {
  const sourceRef: ConnectedSourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse',
      provider: 'postgres',
    },
    sourceObjectId: 'raw.orders',
  };
  const columns = [
    { name: 'order_id', type: 'integer' },
    { name: 'customer', type: 'text', nullable: false },
    { name: 'amount', type: 'numeric' },
  ];
  const source: CanonicalNode = {
    id: 'source',
    name: 'orders',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: { schema: 'raw', tableName: 'orders', connectedSourceRef: sourceRef, columns },
  };
  let draft = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'orders',
      sourceRef,
      fields: columns.map(({ name, type }) => ({ name, dataType: type })),
    },
    targetNodeId: 'model',
    outputs: columns.map(({ name }) => ({
      fieldId: `output:${name}`,
      name: name === 'customer' ? physicalAlias : name,
      sourceFieldName: name,
    })),
  });
  const functions = resolveDvtSubstraitColumnFunctions({
    dataTypes: ['text', 'text'],
    provider: 'postgres',
  });
  const upper = resolveDvtSubstraitColumnFunctions({ dataType: 'text', provider: 'postgres' }).find(
    (operation) => operation.name === 'upper'
  );
  const concat = functions.find((operation) => operation.name === 'concat');
  if (upper == null || concat == null) throw new Error('Expected admitted text functions.');
  const uppercase = createDvtSubstraitProjectionOutput(
    draft,
    {
      alias: 'customer_upper',
      expression: {
        kind: 'scalar-function',
        capabilityId: upper.capabilityId,
        operandFieldIds: ['output:customer'],
      },
    },
    { inputDataTypes: ['text'], provider: 'postgres' }
  );
  if (uppercase.outcome !== 'applied') throw new Error('Expected UPPER output.');
  const combined = createDvtSubstraitProjectionOutput(
    uppercase.draft,
    {
      alias: 'customer_pair',
      expression: {
        kind: 'scalar-function',
        capabilityId: concat.capabilityId,
        operandFieldIds: ['output:customer', uppercase.createdFieldId],
      },
    },
    { inputDataTypes: ['text', 'text'], provider: 'postgres' }
  );
  if (combined.outcome !== 'applied') throw new Error('Expected CONCAT output.');
  draft = combined.draft;
  if (withLiteral) {
    const literal = createDvtSubstraitProjectionOutput(draft, {
      alias: 'channel',
      expression: { kind: 'string-literal', value: 'web' },
    });
    if (literal.outcome !== 'applied') throw new Error('Expected literal output.');
    draft = literal.draft;
  }
  const model = applyDvtSubstraitSemanticDocument(
    {
      id: 'model',
      name: 'Model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    },
    encodeDvtSubstraitProjectionDocument(draft)
  );
  const session: CanvasDraftSession = {
    syncState: 'editing',
    baseline: { record: null },
    draftRevision: null,
    workingSet: {
      visibleNodeIds: [source.id, model.id],
      visibleEdges: [{ sourceId: source.id, targetId: model.id }],
      pendingExplicitNodeIds: [],
    },
    localNodeCatalog: { source, model },
  };
  const canonicalNodesById = new Map([source, model].map((node) => [node.id, node]));
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  if (!inspection.ok) throw new Error('Expected projection.');
  const inputId = inspection.projection.inputFields.find(
    (field) => field.name === 'customer'
  )!.fieldId;
  const toggle = (
    current: CanvasDraftSession,
    columnId: string,
    output: boolean,
    placement?: Readonly<{ targetColumnId: string; placement: 'before' | 'after' }>
  ): ReturnType<typeof applyCanvasRelationOutput> =>
    applyCanvasRelationOutput({
      draftSession: current,
      canonicalNodesById,
      intent: {
        nodeId: model.id,
        columnId,
        columnType: 'text',
        output,
        ...(placement == null ? {} : { placement }),
      },
    });
  const hidden = await toggle(session, 'output:customer', false);
  if (hidden.outcome !== 'applied') throw new Error('Expected exclusion.');
  return { source, model, session, hidden: hidden.draftSession, inputId, toggle };
}

function readDraft(
  session: CanvasDraftSession
): ReturnType<typeof decodeDvtSubstraitProjectionDocument> {
  const authority = readDvtTransformAuthoringAuthority(session.localNodeCatalog!.model!);
  if (authority == null) throw new Error('Expected canonical authority.');
  return decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
}

describe('explicit relation output selection beside calculations', () => {
  it.each([false, true])(
    'retains expressions and identities (literal: %s)',
    async (withLiteral) => {
      const { hidden, inputId, toggle } = await fixture(withLiteral);
      const original = JSON.stringify(hidden);
      const before = readDraft(hidden);
      const restored = await toggle(hidden, inputId, true, {
        targetColumnId: 'output:amount',
        placement: 'before',
      });
      expect(restored.outcome).toBe('applied');
      if (restored.outcome !== 'applied') return;
      const after = readDraft(restored.draftSession);
      const inspection = inspectDvtSubstraitProjectionDraft(after);
      expect(inspection.ok).toBe(true);
      if (!inspection.ok) return;
      expect(inspection.projection.outputs.map((output) => output.name)).toEqual([
        'order_id',
        'customer',
        'amount',
        'customer_upper',
        'customer_pair',
        ...(withLiteral ? ['channel'] : []),
      ]);
      const root = after.plan.relations[0]?.relType;
      const oldRoot = before.plan.relations[0]?.relType;
      if (root?.case !== 'root' || oldRoot?.case !== 'root') throw new Error('Expected roots.');
      const project = root.value.input?.relType;
      const oldProject = oldRoot.value.input?.relType;
      if (project?.case !== 'project' || oldProject?.case !== 'project')
        throw new Error('Expected Projects.');
      expect(project.value.expressions).toEqual(oldProject.value.expressions);
      expect(project.value.input).toEqual(oldProject.value.input);
      expect(after.plan.extensions).toEqual(before.plan.extensions);
      expect(after.plan.extensionUrns).toEqual(before.plan.extensionUrns);
      expect(after.sidecar.relations).toEqual(before.sidecar.relations);
      for (const field of before.sidecar.fields) {
        const { outputOrdinal: _ordinal, ...identity } = field;
        expect(after.sidecar.fields.find((item) => item.fieldId === field.fieldId)).toMatchObject(
          identity
        );
      }
      const returned = inspection.projection.outputs.find((output) => output.name === 'customer')!;
      expect(returned.fieldId).not.toBe('output:customer');
      expect(
        after.sidecar.fields.find((field) => field.fieldId === returned.fieldId)?.sourceFieldId
      ).toBe(inputId);
      const repeated = await toggle(restored.draftSession, returned.fieldId, true);
      expect(repeated.outcome).toBe('applied');
      if (repeated.outcome === 'applied') expect(readDraft(repeated.draftSession)).toEqual(after);
      expect(JSON.stringify(hidden)).toBe(original);
    }
  );

  it('keeps an explicit alias without duplicating its physical input', async () => {
    const { source, model, session } = await fixture(false, 'customer_alias');
    const truth = await projectCanvasNodePresentationTruth({
      node: model,
      nodes: [source, model],
      edges: session.workingSet.visibleEdges,
    });
    expect(truth.columns.visible.map(({ name, provenance }) => ({ name, provenance }))).toEqual(
      ['order_id', 'customer_alias', 'amount', 'customer_upper', 'customer_pair'].map((name) => ({
        name,
        provenance: 'declared',
      }))
    );
  });

  it.each([
    'unknown',
    'mutable-name',
    'disconnected',
    'unavailable',
    'wrong-source',
    'invalid-placement',
    'invalid-document',
  ])('rejects %s atomically', async (scenario) => {
    const { source, hidden, inputId, toggle } = await fixture();
    const current = structuredClone(hidden);
    if (scenario === 'disconnected') current.workingSet.visibleEdges = [];
    if (scenario === 'invalid-document') {
      const model = current.localNodeCatalog!.model!;
      const authority = readDvtTransformAuthoringAuthority(model)!;
      current.localNodeCatalog!.model = {
        ...model,
        metadata: {
          ...model.metadata,
          transformAuthoring: {
            ...authority,
            semanticDocument: {
              ...authority.semanticDocument,
              semanticPlan: { ...authority.semanticDocument.semanticPlan, bytesBase64: 'invalid' },
            },
          },
        },
      };
    }
    if (scenario === 'unavailable' || scenario === 'wrong-source') {
      const sourceDraft = createDvtSubstraitProjectionDraft({
        source: {
          nodeId: source.id,
          schema: 'raw',
          table: 'orders',
          sourceRef: source.metadata!.connectedSourceRef as ConnectedSourceRef,
          fields: [
            { name: 'order_id', dataType: 'integer' },
            { name: 'customer', dataType: 'text' },
            { name: 'amount', dataType: 'numeric' },
          ],
        },
        targetNodeId: source.id,
        outputs: [{ fieldId: 'source:order_id', name: 'order_id', sourceFieldName: 'order_id' }],
      });
      current.localNodeCatalog!.source = applyDvtSubstraitSemanticDocument(
        source,
        encodeDvtSubstraitProjectionDocument(sourceDraft)
      );
    }
    if (scenario === 'wrong-source') {
      current.localNodeCatalog!.other = {
        ...source,
        id: 'other',
        metadata: {
          ...source.metadata,
          tableName: 'other',
          connectedSourceRef: {
            ...(source.metadata!.connectedSourceRef as ConnectedSourceRef),
            sourceObjectId: 'raw.other',
          },
          columns: [{ name: 'customer', type: 'text' }],
        },
      };
      current.workingSet.visibleNodeIds.push('other');
      current.workingSet.visibleEdges.push({ sourceId: 'other', targetId: 'model' });
    }
    const before = JSON.stringify(current);
    const result = await toggle(
      current,
      scenario === 'unknown' ? 'missing' : scenario === 'mutable-name' ? 'customer' : inputId,
      true,
      scenario === 'invalid-placement'
        ? { targetColumnId: 'missing', placement: 'before' }
        : undefined
    );
    expect(result.outcome).toBe('rejected');
    expect(JSON.stringify(current)).toBe(before);
  });
});
