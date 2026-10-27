// @vitest-environment jsdom
/** Prove the real Source inspector restores one self-JOIN contribution through Model Apply. */
import { act, useState } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import {
  occurrenceGraph,
  occurrenceInput,
} from './relational-source-occurrence/occurrence.test.fixtures';
import { createSourceJoin } from './canvasSourceJoin';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  encodeDvtSubstraitSemanticDocument,
  decodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { applyCanvasInspectorNodeDraftWithInputsToSession } from './canvasInspectorAuthoringCommand';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftInputChanges,
} from './canvasInspectorAuthoring.types';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  COPY,
  container,
  root,
  setupWorkbenchTest,
} from './CanvasRelationalTreeWorkbench.test-support';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

describe('Source Input and Output Model transaction', () => {
  setupWorkbenchTest();
  it('preserves the recovery row and focus, cancels both changes, then applies only the selected occurrence', async () => {
    useApplicationLanguageStore.setState({ language: 'en' });
    const graph = occurrenceGraph();
    const complete = createSourceJoin({
      left: occurrenceInput,
      right: occurrenceInput,
      leftFieldName: 'id',
      rightFieldName: 'id',
      targetNodeId: 'model',
    });
    const preparation = new CanvasRelationAnalysisSession('self-join-input-recovery');
    preparation.receive(complete);
    const initialDocument = await changeSelectedRelationOutputs(preparation, {
      relationId: preparation.rootId,
      expectedRevision: 0,
      outputs: [0, 2].map((slot) => ({ slot })),
    });
    preparation.dispose();
    const model = applyDvtSubstraitSemanticDocument(
      graph.targetNode,
      encodeDvtSubstraitSemanticDocument(initialDocument)
    );
    const canonicalNodes = new Map([graph.source, model].map((node) => [node.id, node]));
    const initial = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: [...canonicalNodes.keys()],
      canonicalEdges: [
        {
          sourceId: graph.source.id,
          targetId: model.id,
          inputBindings: { version: 'v1', fields: [{ inputId: 'id-only', producerFieldId: 'id' }] },
        },
      ],
    });
    let workspace = initial;
    let update!: (value: CanvasDraftSession) => void;
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
        if (result.outcome === 'applied') update(result.draftSession);
        return result;
      }
    );
    function Host(): JSX.Element {
      const [session, setSession] = useState(initial);
      workspace = session;
      update = setSession;
      const nodes = resolveCanvasDraftNodes(session, canonicalNodes);
      const edges = session.workingSet.visibleEdges.map((edge) => ({
        id: 'source-model',
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        relation: 'lineage' as const,
        metadata: { inputBindings: edge.inputBindings },
      }));
      return (
        <CanvasRelationalTreeWorkbench
          transformNode={nodes.find((node) => node.id === model.id)!}
          nodes={nodes}
          edges={edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      );
    }
    await act(async () => root.render(<Host />));
    const visible = (): HTMLElement =>
      container.querySelector<HTMLElement>('[data-canvas-inspector="true"]:not([hidden])')!;
    const click = async (selector: string): Promise<void> =>
      act(async () => {
        fireEvent.click(container.querySelector(selector)!);
      });
    await click('[data-operator="join"]');
    await act(async () =>
      fireEvent.click(visible().querySelector('[data-slot="canvas-relational-edit"]')!)
    );
    const selectedReadId = container
      .querySelector('[data-operator="read"]')!
      .getAttribute('data-relation-id');
    await click('[data-operator="read"]');
    expect(visible().querySelector('[data-slot="source-occurrence-remove-field"]')).toBeNull();
    const edit = async (): Promise<void> =>
      act(async () => {
        fireEvent.click(visible().querySelector('[data-slot="canvas-relational-edit"]')!);
      });
    await edit();
    const recover = async (): Promise<void> => {
      const button = visible().querySelector<HTMLButtonElement>('[data-field-name="parent_id"]')!;
      expect(button).not.toBeNull();
      button.focus();
      await act(async () => fireEvent.click(button));
      expect(button.isConnected).toBe(true);
      expect(document.activeElement).toBe(button);
      expect(button.getAttribute('data-included')).toBe('true');
    };
    await recover();
    expect(apply).not.toHaveBeenCalled();
    expect(workspace).toBe(initial);
    await click('[data-slot="canvas-relational-tree-cancel"]');
    expect(workspace).toBe(initial);
    await edit();
    await recover();
    await click('[data-slot="canvas-relational-tree-apply"]');
    expect(apply).toHaveBeenCalledOnce();
    expect(
      workspace.workingSet.visibleEdges[0]!.inputBindings!.fields.map(
        (field) => field.producerFieldId
      )
    ).toEqual(['id', 'parent_id']);
    const saved = resolveCanvasDraftNodes(workspace, canonicalNodes).find(
      (node) => node.id === model.id
    )!;
    const authority = saved.metadata!.transformAuthoring as { semanticDocument: unknown };
    const actual = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
    const before = indexSubstraitRelations(initialDocument);
    const after = indexSubstraitRelations(actual);
    if (!before.ok || !after.ok) throw new Error('Expected canonical self-JOIN.');
    for (const [id, entry] of before.index.relations)
      if (id !== before.index.rootId) expect(after.index.relations.get(id)).toEqual(entry);
    const oracle = new CanvasRelationAnalysisSession('saved-occurrence-output');
    oracle.receive(actual);
    expect((await oracle.query(null)).fields).toHaveLength(3);
    const reads = [...after.index.relations.values()].filter(
      (entry) => entry.relation.relType.case === 'read'
    );
    const siblingParent = reads
      .find((read) => read.binding.relationId !== selectedReadId)!
      .fields.find((field) => field.displayName === 'parent_id')!.fieldId;
    expect(
      (await oracle.query(null)).bindings.some((field) => field.sourceFieldId === siblingParent)
    ).toBe(false);
    expect(
      resolveCanvasDraftNodes(workspace, canonicalNodes).find((node) => node.id === graph.source.id)
    ).toEqual(graph.source);
    oracle.dispose();
  });
});
