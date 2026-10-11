/** Owned concern: prove card deletion preserves graph identities and retained configuration. */
import { describe, expect, it } from 'vitest';
import { prepareCanvasCardRemoval } from './canvasCardRemoval';
import { compositionGraphHarness } from './canvasCompositionSequence.test-support';
import { configureCompositionStep } from './canvasCompositionConfiguration.test-support';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';

describe('card removal proposal', () => {
  it.each(['inner_join', 'union_all', 'filter', 'field_transform'] as const)(
    'removes only a %s producer and preserves its consumer and source branches',
    async (kind) => {
      const harness = compositionGraphHarness();
      const sources = harness.state.sources.slice(0, 3);
      const ids = sources.map((entry) => entry.read.binding.relationId);
      const inputs =
        kind === 'inner_join' || kind === 'union_all' ? ids.slice(0, 2) : ids.slice(0, 1);
      const target = await configureCompositionStep(harness, kind, inputs);
      const consumer = await configureCompositionStep(harness, 'field_transform', [target]);
      const operations = harness.state.operations;
      const proposal = prepareCanvasCardRemoval(
        { document: null, inputIds: [], sources, operations, outputRelationId: consumer },
        target
      );
      expect(proposal.target.id).toBe(target);
      expect(proposal.dependents.map((entry) => entry.id)).toEqual([consumer]);
      expect(proposal.graph.sources).toEqual(sources);
      expect(proposal.graph.operations).toHaveLength(1);
      expect(proposal.graph.operations[0]).toMatchObject({
        id: consumer,
        inputs: [null],
        configurationDocument: operations[1]!.semanticDocument,
      });
      expect(proposal.graph.operations[0]!.semanticDocument).toBeUndefined();
      expect(proposal.graph.outputRelationId).toBe(consumer);
      expect(operations).toHaveLength(2);
      expect(operations[1]!.inputs).toEqual([target]);
    }
  );

  it.each([false, true])(
    'retains every UNION operand and downstream configuration (canonical=%s)',
    async (canonical) => {
      const harness = compositionGraphHarness();
      const sources = harness.state.sources.slice(0, 3);
      const ids = sources.map((entry) => entry.read.binding.relationId);
      const union = await configureCompositionStep(harness, 'union_all', ids);
      const consumer = await configureCompositionStep(harness, 'field_transform', [union]);
      const operations = harness.state.operations;
      const document = decodeCanvasStagedOperation(operations[1]!)!;
      const before = structuredClone(document);
      const proposal = prepareCanvasCardRemoval(
        {
          document: canonical ? document : null,
          inputIds: canonical ? harness.inputs.slice(0, 3).map((entry) => entry.nodeId) : [],
          sources: canonical ? [] : sources,
          operations: canonical ? [] : operations,
          outputRelationId: consumer,
        },
        ids[1]!
      );
      expect(proposal.graph.sources.map((entry) => entry.read.binding.relationId)).toEqual([
        ids[0],
        ids[2],
      ]);
      expect(new Set(proposal.graph.operations.map((entry) => entry.id))).toEqual(
        new Set([union, consumer])
      );
      expect(proposal.graph.operations.find((entry) => entry.id === union)!.inputs).toEqual([
        ids[0],
        null,
        ids[2],
      ]);
      expect(
        proposal.graph.operations.every(
          (entry) => entry.semanticDocument == null && entry.configurationDocument != null
        )
      ).toBe(true);
      expect(proposal.dependents.map((entry) => entry.id)).toEqual([union]);
      expect(document).toEqual(before);
    }
  );

  it('rejects an unknown card without changing the graph', () => {
    const graph = {
      document: null,
      inputIds: [],
      sources: [],
      operations: [],
      outputRelationId: null,
    };
    expect(() => prepareCanvasCardRemoval(graph, 'missing')).toThrow('card_unavailable');
    expect(graph.operations).toEqual([]);
  });
});
