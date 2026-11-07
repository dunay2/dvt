// @vitest-environment jsdom
/** Repair retained producer identity through the existing Model authoring transaction. */
import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  createModelOutputDependencyFixture,
  modelDependencyDocument,
} from './canvasModelOutputDependency.test-support';
import { applyCanvasInspectorNodeDraftWithInputsToSession } from './canvasInspectorAuthoringCommand';
import { canvasDraftSession } from './canvasDraftSession';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import { analyzeCanvasRelations } from './canvasRelationalAnalysis';
import {
  connectWorkbenchOutput,
  instantiateWorkbenchSource,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import {
  COPY,
  container,
  root,
  setupWorkbenchTest,
  dragSourceTo,
} from './CanvasRelationalTreeWorkbench.test-support';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftInputChanges,
} from './canvasInspectorAuthoring.types';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

describe('Model missing producer structural repair', () => {
  setupWorkbenchTest();

  it('keeps Cancel read-only, then explicitly replaces the missing Read, applies and reopens the JOIN', async () => {
    useApplicationLanguageStore.setState({ language: 'en' });
    const graph = await createModelOutputDependencyFixture();
    const replacement = { ...graph.producer, id: 'replacement-model', name: graph.producer.name };
    const nodes = [graph.source, graph.right, replacement, graph.consumer];
    const canonicalNodes = new Map(nodes.map((node) => [node.id, node]));
    const initial = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: [...canonicalNodes.keys()],
      canonicalEdges: [
        { sourceId: graph.source.id, targetId: replacement.id },
        { sourceId: graph.right.id, targetId: graph.consumer.id },
        { sourceId: replacement.id, targetId: graph.consumer.id },
      ],
    });
    let workspace = initial;
    const apply = vi.fn(
      async (
        nodeId: string,
        draft: CanvasInspectorNodeDraft,
        changes?: CanvasInspectorNodeDraftInputChanges
      ) => {
        const node = resolveCanvasDraftNodes(workspace, canonicalNodes).find(
          (entry) => entry.id === nodeId
        )!;
        const result = await applyCanvasInspectorNodeDraftWithInputsToSession({
          draftSession: workspace,
          canonicalNodesById: canonicalNodes,
          node,
          draft,
          changes: changes ?? { inputAdditions: [] },
          editable: true,
          workspaceScope: {
            tenantId: 'tenant',
            projectId: 'project',
            environmentId: 'dev',
            targetAdapter: 'temporal',
          },
        });
        if (result.outcome === 'applied') workspace = result.draftSession;
        return result;
      }
    );
    const current = (): { node: CanonicalNode; nodes: CanonicalNode[]; edges: CanonicalEdge[] } => {
      const visible = resolveCanvasDraftNodes(workspace, canonicalNodes);
      return {
        node: visible.find((node) => node.id === graph.consumer.id)!,
        nodes: visible,
        edges: workspace.workingSet.visibleEdges.map((edge, index) => ({
          ...edge,
          id: `edge-${index}`,
          relation: 'lineage' as const,
          ...(edge.inputBindings == null
            ? {}
            : { metadata: { inputBindings: edge.inputBindings } }),
        })),
      };
    };
    const render = async (): Promise<void> => {
      const snapshot = current();
      await act(async () =>
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={snapshot.node}
            nodes={snapshot.nodes}
            edges={snapshot.edges}
            copy={COPY}
            authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
          />
        )
      );
    };
    const indexed = indexSubstraitRelations(graph.consumerDocument);
    if (!indexed.ok) throw indexed.error;
    const missingReadId = [...indexed.index.relations.values()].find(
      (entry) => entry.binding.producerRef?.nodeId === graph.producer.id
    )!.binding.relationId;
    const removeMissing = async (): Promise<void> => {
      const card = container.querySelector<HTMLElement>(
        `[data-operator="read"][data-relation-id="${missingReadId}"]`
      )!;
      expect(card).not.toBeNull();
      await act(async () => fireEvent.contextMenu(card));
      await act(async () =>
        fireEvent.click(document.querySelector('[data-slot="canvas-relational-remove-source"]')!)
      );
      await act(async () =>
        fireEvent.click(container.querySelector('[data-slot="canvas-card-removal-confirm"]')!)
      );
      expect(
        container.querySelector(`[data-operator="read"][data-relation-id="${missingReadId}"]`)
      ).toBeNull();
    };
    await render();
    expect(analyzeCanvasRelations(current()).semantic?.state).toBe('disconnected');
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    await removeMissing();
    expect(apply).not.toHaveBeenCalled();
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-relational-tree-cancel"]')!)
    );
    expect(workspace).toBe(initial);
    expect(
      container.querySelector(`[data-operator="read"][data-relation-id="${missingReadId}"]`)
    ).not.toBeNull();
    await removeMissing();
    const source = Array.from(
      container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-tree-source"]')
    ).find((entry) => entry.textContent?.includes(replacement.name))!;
    expect(source).not.toBeNull();
    await instantiateWorkbenchSource(source);
    const pendingRead = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending="true"][data-operator="read"]')
    ).find((entry) => entry.textContent?.includes(replacement.name))!;
    const output = pendingRead.parentElement!.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-output-port"]'
    )!;
    const join = Array.from(
      container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
    ).find((entry) => entry.querySelector('[data-operator="join"]') != null)!;
    const left = join.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]')!;
    await act(async () => dragSourceTo(output, left));
    await act(async () => Promise.resolve());
    await act(async () => fireEvent.click(join.querySelector('[data-operator="join"]')!));
    const reconfigure = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-staged-operation-reconfigure"]'
    )!;
    expect(reconfigure.disabled).toBe(false);
    await act(async () => fireEvent.click(reconfigure));
    await connectWorkbenchOutput(
      container,
      join.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
    );
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="canvas-relational-tree-apply"]')!)
    );
    expect(apply).toHaveBeenCalledOnce();
    expect(workspace).not.toBe(initial);
    const saved = modelDependencyDocument(current().node);
    expect(
      saved.sidecar.relations.some((binding) => binding.producerRef?.nodeId === graph.producer.id)
    ).toBe(false);
    expect(
      saved.sidecar.relations.some((binding) => binding.producerRef?.nodeId === replacement.id)
    ).toBe(true);
    await act(async () => root.render(null));
    await render();
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-operator="join"]')).toHaveLength(1);
    expect(analyzeCanvasRelations(current()).semantic?.state).toBe('resolved');
  });
});
