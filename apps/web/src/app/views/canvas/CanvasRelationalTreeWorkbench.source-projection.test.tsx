// @vitest-environment jsdom
/** Producer occurrences retain publication and query identity through Apply and reopen. */
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/dom';
import {
  allocateDvtFieldId,
  allocateDvtRelationId,
  asIsoUtcString,
  TransformDataSampleResponseSchema,
  type TransformDataSampleRequest,
} from '@dvt/contracts';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  dropWorkbenchSource,
  stageWorkbenchOperation,
  connectWorkbenchOutput,
  disconnectWorkbenchOutput,
  connectStagedWorkbenchBinaryOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import { pendingSourceOutputPorts } from './CanvasRelationalTreeWorkbench.operation-drag.test-support';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  COPY,
  container,
  dragSourceTo,
  edge,
  root,
  setupWorkbenchTest,
  sourceNode,
  sourceRef,
  transformNode,
} from './CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';

describe('Canvas relational-tree source projection', () => {
  setupWorkbenchTest();

  it.each(['source', 'dbt-model'] as const)(
    'connects a %s directly to Output and retains its publication through Apply and reopen',
    async (kind) => {
      const producer = sourceNode('customers', 'customers');
      if (kind === 'dbt-model') {
        producer.kind = 'dvt:transform';
        producer.role = 'transform';
        producer.path = 'models/customers.sql';
        producer.metadata = {
          dbtModelReference: {
            schemaVersion: 'workspace-dbt-model-reference.v1',
            canvasId: 'file-owner',
            uniqueId: 'model.demo.customers',
            connectionRef: sourceRef('customers').connectionRef,
            relationId: allocateDvtRelationId(),
            fields: ['text', 'numeric'].map((dataType, ordinal) => ({
              fieldId: allocateDvtFieldId(),
              name: ordinal === 0 ? 'customer_id' : 'amount',
              dataType,
              nullable: true,
            })),
          },
        };
      }
      const original = structuredClone(producer);
      const additional = sourceNode('clients', 'clients');
      const target = transformNode();
      const dataHost = document.createElement('div');
      const query = {
        previewTransformRows: vi.fn(async (request: TransformDataSampleRequest) =>
          TransformDataSampleResponseSchema.parse({
            ...request,
            contractVersion: 1,
            draftRevision: 'saved-read',
            columns: [
              { name: 'customer_id', type: 'text', nullable: true },
              { name: 'amount', type: 'numeric', nullable: true },
            ],
            rows: [{ values: ['C-1', '1.25'] }],
            truncated: false,
            provenance: {
              mode: 'live',
              sourceRefs: [sourceRef('customers')],
              queriedAt: asIsoUtcString('2026-11-04T00:00:00.000Z'),
              limit: 20,
              navigation: 'bounded-first-page',
            },
          })
        ),
      };
      const apply = vi.fn((_id: string, _draft: CanvasInspectorNodeDraft) => ({
        outcome: 'no_changes' as const,
      }));
      const render = async (node = target, includeAdditional = false): Promise<void> => {
        const nodes = [producer, ...(includeAdditional ? [additional] : []), node];
        const edges = [edge(producer.id), ...(includeAdditional ? [edge(additional.id)] : [])];
        await act(async () =>
          root.render(
            <CanvasRelationalTreeWorkbench
              transformNode={node}
              nodes={nodes}
              edges={edges}
              copy={COPY}
              authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
              preview={{
                canvasId: 'canvas',
                query,
                dataHost,
                preparePreview: async () => ({
                  ok: true,
                  canonicalNodes: nodes,
                  canonicalEdges: edges,
                  workspaceNodeIds: nodes.map((input) => input.id),
                }),
              }}
            />
          )
        );
      };
      await render();
      await dropWorkbenchSource(producer.id);
      const readId = container
        .querySelector('[data-pending="true"][data-operator="read"]')!
        .getAttribute('data-relation-id');
      await connectWorkbenchOutput(container, pendingSourceOutputPorts()[0]!);
      expect(container.querySelector('[data-slot="canvas-relational-output-edge"]')).not.toBeNull();
      const button = (): HTMLButtonElement =>
        container.querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-apply"]')!;
      await waitFor(() => expect(button().disabled).toBe(false));
      await act(async () => button().click());
      expect(apply).toHaveBeenCalledOnce();
      const saved = applyCanvasInspectorNodeDraft(target, apply.mock.calls[0]![1]);
      const semanticDocument = decodeDvtSubstraitSemanticDocument(
        readDvtTransformAuthoringAuthority(saved)!.semanticDocument
      );
      const indexed = indexSubstraitRelations(semanticDocument);
      if (!indexed.ok) throw indexed.error;
      expect(indexed.index.rootId).toBe(readId);
      expect(indexed.index.relations.size).toBe(1);
      const read = indexed.index.relations.get(readId!)!;
      expect(read.relation.relType.case).toBe('read');
      if (kind === 'dbt-model') expect(read.binding.producerRef?.nodeId).toBe(producer.id);
      expect(read.fields).toHaveLength(kind === 'dbt-model' ? 2 : 1);
      expect(JSON.stringify(saved.metadata)).not.toContain('compiledSql');
      expect(producer).toEqual(original);
      await render(saved);
      expect(container.querySelector('[data-slot="canvas-relational-output-edge"]')).not.toBeNull();
      expect(
        container.querySelector('[data-operator="read"]')?.getAttribute('data-relation-id')
      ).toBe(readId);
      if (kind === 'dbt-model') {
        const preview = container.querySelector<HTMLButtonElement>(
          '[data-slot="canvas-node-execute"]'
        )!;
        expect(preview.disabled).toBe(false);
        await act(async () => preview.click());
        expect(query.previewTransformRows).toHaveBeenCalledExactlyOnceWith({
          canvasId: 'canvas',
          transformNodeId: target.id,
          relationId: readId,
          semanticPlanSha256: semanticDocument.sidecar.semanticPlanSha256,
          limit: 20,
        });
        expect(dataHost.querySelector('table')?.textContent).toContain('C-1');
        expect(dataHost.querySelector('table')?.textContent).toContain('1.25');
        expect(apply).toHaveBeenCalledOnce();
        const retainedTable = dataHost.querySelector('table');
        await render(saved, true);
        expect(dataHost.querySelector('table')).toBe(retainedTable);
        await dropWorkbenchSource(additional.id);
        expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
        const retainedPreview = container
          .querySelector<HTMLButtonElement>(`[data-relation-id="${readId}"]`)
          ?.closest('[data-slot="canvas-relational-card"]')
          ?.querySelector<HTMLButtonElement>('[data-slot="canvas-node-execute"]');
        expect(retainedPreview?.disabled).toBe(false);
        expect(dataHost.querySelector('table')).toBe(retainedTable);
        expect(query.previewTransformRows).toHaveBeenCalledTimes(1);
        expect(apply).toHaveBeenCalledTimes(1);
        await disconnectWorkbenchOutput(container);
        await stageWorkbenchOperation('inner-join');
        await connectStagedWorkbenchBinaryOperation();
        expect(
          container.querySelectorAll('[data-slot="canvas-relational-pending-edge"]')
        ).toHaveLength(2);
        expect(container.querySelector(`[data-relation-id="${readId}"]`)).not.toBeNull();
        expect(query.previewTransformRows).toHaveBeenCalledTimes(1);
        expect(apply).toHaveBeenCalledTimes(1);
      }
    }
  );

  it('connects a dropped instance without replacing its identity', async () => {
    const source = sourceNode('customers', 'customers');
    const target = transformNode();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={target}
          nodes={[source, target]}
          edges={[edge(source.id)]}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: vi.fn() }}
        />
      )
    );
    await dropWorkbenchSource(source.id);
    const id = container.querySelector('[data-pending="true"]')?.getAttribute('data-relation-id');
    await stageWorkbenchOperation('projection');
    const projection = container.querySelector<HTMLElement>('[data-pending-operation="true"]')!;
    const producer = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
    ).find((port) => port.parentElement?.querySelector('[data-pending="true"]') != null)!;
    await act(async () =>
      dragSourceTo(
        producer,
        projection.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]')!
      )
    );
    expect(
      container.querySelector('[data-operator="read"]')?.getAttribute('data-relation-id')
    ).toBe(id);
    expect(container.querySelector('[data-operator="project"]')).not.toBeNull();
  });

  it('rejects catalogue drops in a read-only model', async () => {
    const graph = occurrenceGraph();
    const apply = vi.fn();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.targetNode}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: false, onApplyNodeDraft: apply }}
        />
      )
    );
    expect(
      container
        .querySelector('[data-slot="canvas-relational-tree-source"]')
        ?.getAttribute('draggable')
    ).toBe('false');
    await dropWorkbenchSource(graph.source.id);
    expect(container.querySelector('[data-slot="source-occurrence-add"]')).toBeNull();
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
    expect(apply).not.toHaveBeenCalled();
  });
});
