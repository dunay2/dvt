// @vitest-environment jsdom
/** Prove local Input recovery is discarded with the real Model graph snapshot. */
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import { readCanvasDvtCompositionInputCatalog } from './canvasDvtCompositionInputCatalog';
import { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { useCanvasSourceInputRecovery } from './useCanvasSourceInputRecovery';
import { setupWorkbenchTest, root } from './CanvasRelationalTreeWorkbench.test-support';
import * as publishedFields from './canvasPublishedInputFields';
import * as recoveryPreparation from './canvasSourceOccurrenceInputRecovery';
import { setDvtSourceOutputIncluded } from './canvasDvtSourceSemanticAuthoring';

describe('Model-local Source Input recovery lifecycle', () => {
  setupWorkbenchTest();
  afterEach(() => vi.restoreAllMocks());
  it('stages a real binding candidate and clears it together with the Model document on Cancel', async () => {
    const graph = occurrenceGraph();
    let nodes = graph.nodes;
    const edges = graph.edges.map((edge) => ({
      ...edge,
      metadata: {
        inputBindings: { version: 'v1', fields: [{ inputId: 'id-only', producerFieldId: 'id' }] },
      },
    }));
    const inputs = readCanvasDvtCompositionInputCatalog({
      targetNodeId: graph.targetNode.id,
      nodes: graph.nodes,
      edges,
    }).inputs;
    let model!: ReturnType<typeof useCanvasRelationalTreeDraftState>;
    let recovery!: ReturnType<typeof useCanvasSourceInputRecovery>;
    function Host(): null {
      model = useCanvasRelationalTreeDraftState();
      recovery = useCanvasSourceInputRecovery({
        state: model,
        editable: true,
        nodeId: graph.targetNode.id,
        nodes,
        edges,
        inputs,
        document: model.joinDraft,
      });
      return null;
    }
    await act(async () => root.render(<Host />));
    await act(async () =>
      model.hydrate({ draft: graph.draft, inputIds: [graph.source.id], operation: 'left_join' })
    );
    const indexed = indexSubstraitRelations(graph.draft);
    if (!indexed.ok) throw indexed.error;
    const read = [...indexed.index.relations.values()].find(
      (entry) => entry.relation.relType.case === 'read'
    )!;
    const field = read.fields.find((entry) => entry.displayName === 'parent_id')!;
    expect(recovery.fieldsByRelationId.get(read.binding.relationId)?.has(field.fieldId)).toBe(true);
    let accepted!: Promise<boolean>;
    await act(async () => {
      accepted = recovery.restore(read.binding.relationId, field.fieldId);
    });
    expect(await accepted).toBe(true);
    expect(recovery.additions).toEqual([{ nodeId: graph.source.id, columnId: 'parent_id' }]);
    expect(recovery.edges).not.toEqual(edges);
    expect(edges[0]!.metadata.inputBindings.fields).toHaveLength(1);
    const stagedEdges = recovery.edges;
    nodes = graph.nodes.map((node) =>
      node.id === graph.source.id
        ? { ...node, metadata: { ...node.metadata, rowCount: 999 } }
        : node
    );
    await act(async () => root.render(<Host />));
    expect(recovery.edges).toBe(stagedEdges);
    expect(recovery.additions).toEqual([{ nodeId: graph.source.id, columnId: 'parent_id' }]);
    const withdrawn = setDvtSourceOutputIncluded(graph.source, 'parent_id', false);
    if (withdrawn.outcome !== 'applied') throw new Error('Expected Source publication withdrawal.');
    nodes = [withdrawn.node, graph.targetNode];
    await act(async () => root.render(<Host />));
    expect(recovery.edges).toBe(edges);
    expect(recovery.additions).toEqual([{ nodeId: graph.source.id, columnId: 'parent_id' }]);
    expect(model.graphSnapshot.inputRecovery).not.toBeNull();
    await act(async () => model.reset());
    expect(recovery.additions).toEqual([]);
    expect(recovery.edges).toBe(edges);
    expect(model.joinDraft).toBeNull();
  });

  it.each(['cancel', 'stale', 'revoked', 'unmount'] as const)(
    'cannot publish a real asynchronous candidate after %s',
    async (change) => {
      const graph = occurrenceGraph();
      const edges = graph.edges.map((edge) => ({
        ...edge,
        metadata: {
          inputBindings: { version: 'v1', fields: [{ inputId: 'id-only', producerFieldId: 'id' }] },
        },
      }));
      const inputs = readCanvasDvtCompositionInputCatalog({
        targetNodeId: graph.targetNode.id,
        nodes: graph.nodes,
        edges,
      }).inputs;
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const read = publishedFields.readCanvasPublishedInputFields;
      const query = vi
        .spyOn(publishedFields, 'readCanvasPublishedInputFields')
        .mockImplementation(async (...args) => {
          const result = await read(...args);
          await gate;
          return result;
        });
      let editable = true;
      let model!: ReturnType<typeof useCanvasRelationalTreeDraftState>;
      let recovery!: ReturnType<typeof useCanvasSourceInputRecovery>;
      function Host(): null {
        model = useCanvasRelationalTreeDraftState();
        recovery = useCanvasSourceInputRecovery({
          state: model,
          editable,
          nodeId: graph.targetNode.id,
          nodes: graph.nodes,
          edges,
          inputs,
          document: model.joinDraft,
        });
        return null;
      }
      await act(async () => root.render(<Host />));
      await act(async () =>
        model.hydrate({ draft: graph.draft, inputIds: [graph.source.id], operation: 'left_join' })
      );
      const [relationId, fields] = [...recovery.fieldsByRelationId][0]!;
      let pending!: Promise<boolean>;
      await act(async () => {
        pending = recovery.restore(relationId, [...fields][0]!);
      });
      expect(query).toHaveBeenCalled();
      await act(async () => {
        if (change === 'cancel') model.reset();
        if (change === 'stale') model.setJoinDraft(structuredClone(graph.draft));
        if (change === 'revoked') {
          editable = false;
          root.render(<Host />);
        }
        if (change === 'unmount') root.render(null);
      });
      await act(async () => {
        release();
        expect(await pending).toBe(false);
      });
      expect(model.graphSnapshot.inputRecovery).toBeNull();
      expect(edges[0]!.metadata.inputBindings.fields).toHaveLength(1);
    }
  );

  it('does not acknowledge a candidate rejected by a queued graph update', async () => {
    const graph = occurrenceGraph();
    const edges = graph.edges.map((edge) => ({
      ...edge,
      metadata: {
        inputBindings: { version: 'v1', fields: [{ inputId: 'id-only', producerFieldId: 'id' }] },
      },
    }));
    const inputs = readCanvasDvtCompositionInputCatalog({
      targetNodeId: graph.targetNode.id,
      nodes: graph.nodes,
      edges,
    }).inputs;
    let release!: () => void;
    let prepared!: () => void;
    const ready = new Promise<void>((resolve) => {
      prepared = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prepare = recoveryPreparation.prepareCanvasSourceOccurrenceInputRecovery;
    vi.spyOn(recoveryPreparation, 'prepareCanvasSourceOccurrenceInputRecovery').mockImplementation(
      async (...args) => {
        const candidate = await prepare(...args);
        prepared();
        await gate;
        return candidate;
      }
    );
    let model!: ReturnType<typeof useCanvasRelationalTreeDraftState>;
    let recovery!: ReturnType<typeof useCanvasSourceInputRecovery>;
    function Host(): null {
      model = useCanvasRelationalTreeDraftState();
      recovery = useCanvasSourceInputRecovery({
        state: model,
        editable: true,
        nodeId: graph.targetNode.id,
        nodes: graph.nodes,
        edges,
        inputs,
        document: model.joinDraft,
      });
      return null;
    }
    await act(async () => root.render(<Host />));
    await act(async () =>
      model.hydrate({ draft: graph.draft, inputIds: [graph.source.id], operation: 'left_join' })
    );
    const [relationId, fields] = [...recovery.fieldsByRelationId][0]!;
    let receipt!: Promise<boolean>;
    await act(async () => {
      receipt = recovery.restore(relationId, [...fields][0]!);
      await ready;
    });
    const newerDocument = structuredClone(graph.draft);
    await act(async () => {
      model.setJoinDraft(newerDocument);
      release();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await receipt).toBe(false);
    expect(model.joinDraft).toBe(newerDocument);
    expect(model.graphSnapshot.inputRecovery).toBeNull();
  });
});
