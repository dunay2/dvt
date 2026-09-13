/** Regression for physical output selection beside calculated expressions. */
import { describe, expect, it } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import { setCanvasColumnOutputIncluded } from './canvasColumnOutputAuthoring';
import {
  readCanvasColumnMappingInputFields,
  readEditableCanvasProjectionEntry,
} from './canvasColumnProjectionAuthority';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import {
  createDvtSubstraitProjectionDraft,
  createDvtSubstraitProjectionDraftFromTransform,
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

function fixture(
  withLiteral = false,
  physicalAlias = 'customer'
): {
  source: CanonicalNode;
  model: CanonicalNode;
  session: CanvasDraftSession;
  hidden: CanvasDraftSession;
  toggle: (
    current: CanvasDraftSession,
    columnId: string,
    output: boolean,
    placement?: Parameters<typeof setCanvasColumnOutputIncluded>[0]['placement']
  ) => ReturnType<typeof setCanvasColumnOutputIncluded>;
} {
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
  const toggle = (
    current: CanvasDraftSession,
    columnId: string,
    output: boolean,
    placement?: Readonly<{ targetColumnId: string; placement: 'before' | 'after' }>
  ): ReturnType<typeof setCanvasColumnOutputIncluded> =>
    setCanvasColumnOutputIncluded({
      draftSession: current,
      canonicalNodesById,
      targetNodeId: model.id,
      columnId,
      columnType: 'text',
      output,
      ...(placement == null ? {} : { placement }),
    });
  const hidden = toggle(session, 'output:customer', false);
  if (hidden.outcome !== 'applied') throw new Error('Expected physical output exclusion.');
  return { source, model, session, hidden: hidden.draftSession, toggle };
}

function readDraft(
  session: CanvasDraftSession
): ReturnType<typeof decodeDvtSubstraitProjectionDocument> {
  const node = session.localNodeCatalog?.model;
  if (node == null) throw new Error('Expected model.');
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) throw new Error('Expected canonical authority.');
  return decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
}

describe('physical field reinclusion beside calculations', () => {
  it.each([false, true])(
    'retains expressions and surviving identities (literal: %s)',
    (withLiteral) => {
      const { hidden, toggle } = fixture(withLiteral);
      const original = JSON.stringify(hidden);
      const before = readDraft(hidden);
      const restored = toggle(hidden, 'customer', true, {
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
      if (root?.case !== 'root' || oldRoot?.case !== 'root')
        throw new Error('Expected plan roots.');
      const project = root.value.input?.relType;
      const oldProject = oldRoot.value.input?.relType;
      if (project?.case !== 'project' || oldProject?.case !== 'project')
        throw new Error('Expected projections.');
      expect(project.value.expressions).toEqual(oldProject.value.expressions);
      expect(project.value.input).toEqual(oldProject.value.input);
      expect(after.plan.extensions).toEqual(before.plan.extensions);
      expect(after.plan.extensionUrns).toEqual(before.plan.extensionUrns);
      expect(after.sidecar.relations).toEqual(before.sidecar.relations);
      expect(JSON.stringify(hidden)).toBe(original);
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
      ).toBe(inspection.projection.inputFields.find((field) => field.name === 'customer')?.fieldId);
      if (!withLiteral) {
        const repeated = toggle(restored.draftSession, returned.fieldId, true);
        expect(repeated.outcome).toBe('applied');
        if (repeated.outcome === 'applied')
          expect(repeated.draftSession).toBe(restored.draftSession);
      }
    }
  );

  it.each([false, true])(
    'keeps the physical input visible independently of expression lineage (literal: %s)',
    (withLiteral) => {
      const { source, hidden } = fixture(withLiteral);
      const model = hidden.localNodeCatalog!.model!;
      const before = JSON.stringify(model);
      const truth = projectCanvasNodePresentationTruth({
        node: model,
        nodes: [source, model],
        edges: hidden.workingSet.visibleEdges,
      });
      expect(truth.columns.visible.map(({ name, provenance }) => ({ name, provenance }))).toEqual([
        { name: 'order_id', provenance: 'declared' },
        { name: 'customer', provenance: 'inherited' },
        { name: 'amount', provenance: 'declared' },
        { name: 'customer_upper', provenance: 'declared' },
        { name: 'customer_pair', provenance: 'declared' },
        ...(withLiteral ? [{ name: 'channel', provenance: 'declared' }] : []),
      ]);
      expect(truth.columns.visible[1]).toMatchObject({
        type: 'text',
        nullable: false,
        sourceNodeId: source.id,
      });
      expect(JSON.stringify(model)).toBe(before);
    }
  );

  it('keeps a renamed passthrough selected without duplicating its physical input', () => {
    const { source, model, session } = fixture(false, 'customer_alias');
    const truth = projectCanvasNodePresentationTruth({
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
    'disconnected',
    'unavailable',
    'wrong-source',
    'same-name-wrong-source',
    'invalid-placement',
    'invalid-document',
  ])('rejects %s without changing the document', (scenario) => {
    const { source, hidden, toggle } = fixture();
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
    if (scenario === 'unavailable' || scenario === 'same-name-wrong-source') {
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
    if (scenario === 'wrong-source' || scenario === 'same-name-wrong-source') {
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
          columns: [
            { name: scenario === 'wrong-source' ? 'foreign_field' : 'customer', type: 'text' },
          ],
        },
      };
      current.workingSet.visibleNodeIds.push('other');
      current.workingSet.visibleEdges.push({ sourceId: 'other', targetId: 'model' });
    }
    const before = JSON.stringify(current);
    const result = toggle(
      current,
      scenario === 'unknown'
        ? 'missing'
        : scenario === 'wrong-source'
          ? 'foreign_field'
          : 'customer',
      true,
      scenario === 'invalid-placement'
        ? { targetColumnId: 'missing', placement: 'before' }
        : undefined
    );
    expect(result.outcome).toBe('rejected');
    expect(JSON.stringify(current)).toBe(before);
    if (scenario === 'same-name-wrong-source') {
      const truth = projectCanvasNodePresentationTruth({
        node: current.localNodeCatalog!.model!,
        nodes: Object.values(current.localNodeCatalog!),
        edges: current.workingSet.visibleEdges,
      });
      expect(truth.columns.visible.some((column) => column.name === 'customer')).toBe(false);
    }
  });
});

describe('calculated upstream field reinclusion', () => {
  it.each([false, true])(
    'preserves upstream expressions and FieldIds (literal: %s)',
    (withLiteral) => {
      const { source, model, session } = fixture(withLiteral);
      const upstream = readDraft(session);
      const inspection = inspectDvtSubstraitProjectionDraft(upstream);
      if (!inspection.ok) throw new Error('Expected upstream projection.');
      const outputs = inspection.projection.outputs;
      const downstreamDraft = createDvtSubstraitProjectionDraftFromTransform({
        source: upstream,
        targetNodeId: 'downstream',
        outputs: outputs.map((output) => ({
          fieldId: `downstream:${output.name}`,
          name: output.name,
          sourceFieldId: output.fieldId,
        })),
      });
      const downstream = applyDvtSubstraitSemanticDocument(
        { ...model, id: 'downstream', name: 'Downstream' },
        encodeDvtSubstraitProjectionDocument(downstreamDraft)
      );
      const nodes = new Map([source, model, downstream].map((node) => [node.id, node]));
      let current: CanvasDraftSession = {
        ...session,
        localNodeCatalog: { ...session.localNodeCatalog, downstream },
        workingSet: {
          ...session.workingSet,
          visibleNodeIds: [...session.workingSet.visibleNodeIds, downstream.id],
          visibleEdges: [
            ...session.workingSet.visibleEdges,
            { sourceId: model.id, targetId: downstream.id },
          ],
        },
      };
      expect(
        readCanvasColumnMappingInputFields({
          sourceNode: model,
          edges: current.workingSet.visibleEdges,
          resolveNode: (id) => nodes.get(id),
        }).map((field) => field.columnId)
      ).toEqual(outputs.map((output) => output.fieldId));
      if (withLiteral) {
        expect(
          readEditableCanvasProjectionEntry({
            targetNode: model,
            edges: current.workingSet.visibleEdges,
            resolveNode: (id) => nodes.get(id),
          }).outcome
        ).toBe('rejected');
      }

      for (const name of ['customer_upper', 'customer_pair', ...(withLiteral ? ['channel'] : [])]) {
        const original = JSON.stringify(current);
        const toggle = (
          draftSession: CanvasDraftSession,
          columnId: string,
          output: boolean
        ): ReturnType<typeof setCanvasColumnOutputIncluded> =>
          setCanvasColumnOutputIncluded({
            draftSession,
            canonicalNodesById: nodes,
            targetNodeId: downstream.id,
            columnId,
            columnType: 'text',
            output,
            ...(output
              ? { placement: { targetColumnId: 'downstream:amount', placement: 'before' as const } }
              : {}),
          });
        const hidden = toggle(current, `downstream:${name}`, false);
        expect(hidden.outcome).toBe('applied');
        if (hidden.outcome !== 'applied') return;
        const inputId = outputs.find((output) => output.name === name)!.fieldId;
        for (const scenario of [
          'unknown',
          'mutable-name',
          'disconnected',
          'stale-upstream',
          'malformed-upstream',
          'invalid-placement',
        ]) {
          const invalid = structuredClone(hidden.draftSession);
          if (scenario === 'disconnected') invalid.workingSet.visibleEdges = [];
          if (scenario === 'stale-upstream')
            invalid.localNodeCatalog!.model = fixture(withLiteral).model;
          if (scenario === 'malformed-upstream') {
            const authority = readDvtTransformAuthoringAuthority(model)!;
            invalid.localNodeCatalog!.model = {
              ...model,
              metadata: {
                ...model.metadata,
                transformAuthoring: {
                  ...authority,
                  semanticDocument: {
                    ...authority.semanticDocument,
                    semanticPlan: {
                      ...authority.semanticDocument.semanticPlan,
                      bytesBase64: 'invalid',
                    },
                  },
                },
              },
            };
          }
          const snapshot = JSON.stringify(invalid);
          expect(
            setCanvasColumnOutputIncluded({
              draftSession: invalid,
              canonicalNodesById: nodes,
              targetNodeId: downstream.id,
              columnId:
                scenario === 'unknown' ? 'missing' : scenario === 'mutable-name' ? name : inputId,
              columnType: 'text',
              output: true,
              ...(scenario === 'invalid-placement'
                ? { placement: { targetColumnId: 'missing', placement: 'before' as const } }
                : {}),
            }).outcome,
            scenario
          ).toBe('rejected');
          expect(JSON.stringify(invalid), scenario).toBe(snapshot);
        }
        const restored = toggle(hidden.draftSession, inputId, true);
        expect(restored.outcome).toBe('applied');
        if (restored.outcome !== 'applied') return;
        const beforeAuthority = readDvtTransformAuthoringAuthority(
          hidden.draftSession.localNodeCatalog!.downstream!
        )!;
        const afterAuthority = readDvtTransformAuthoringAuthority(
          restored.draftSession.localNodeCatalog!.downstream!
        )!;
        const before = decodeDvtSubstraitProjectionDocument(beforeAuthority.semanticDocument);
        const after = decodeDvtSubstraitProjectionDocument(afterAuthority.semanticDocument);
        const root = after.plan.relations[0]?.relType;
        const previousRoot = before.plan.relations[0]?.relType;
        if (root?.case !== 'root' || previousRoot?.case !== 'root')
          throw new Error('Expected roots.');
        const project = root.value.input?.relType;
        const previousProject = previousRoot.value.input?.relType;
        if (project?.case !== 'project' || previousProject?.case !== 'project')
          throw new Error('Expected projections.');
        expect(project.value.input).toEqual(previousProject.value.input);
        expect(project.value.expressions).toEqual(previousProject.value.expressions);
        expect(after.plan.extensions).toEqual(before.plan.extensions);
        expect(after.plan.extensionUrns).toEqual(before.plan.extensionUrns);
        expect(after.sidecar.relations).toEqual(before.sidecar.relations);
        for (const field of before.sidecar.fields) {
          const { outputOrdinal: _ordinal, ...identity } = field;
          expect(after.sidecar.fields.find((item) => item.fieldId === field.fieldId)).toMatchObject(
            identity
          );
        }
        const result = inspectDvtSubstraitProjectionDraft(after);
        if (!result.ok) throw new Error('Expected valid restored projection.');
        const names = result.projection.outputs.map((output) => output.name);
        expect(names).toHaveLength(outputs.length);
        expect(names[names.indexOf('amount') - 1]).toBe(name);
        expect(result.projection.outputs.find((output) => output.name === name)).toMatchObject({
          sourceFieldId: inputId,
        });
        expect(JSON.stringify(current)).toBe(original);
        expect(restored.draftSession.localNodeCatalog!.model).toEqual(model);
        current = JSON.parse(JSON.stringify(restored.draftSession)) as CanvasDraftSession;
      }
    }
  );
});
