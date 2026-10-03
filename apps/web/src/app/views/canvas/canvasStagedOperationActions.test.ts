import { describe, expect, it } from 'vitest';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { createCanvasStagedOperationActions } from './canvasStagedOperationActions';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  decodeCanvasStagedOperation,
  resolveCanvasStagedEditingDocument,
} from './canvasStagedOperationDocument';

function actionsFor(state: {
  operations: readonly CanvasStagedOperation[];
  consumedProducerIds?: readonly string[];
}): ReturnType<typeof createCanvasStagedOperationActions> {
  return createCanvasStagedOperationActions({
    editable: true,
    start: () => true,
    operations: state.operations,
    setOperations: (update) => {
      state.operations = update(state.operations);
    },
    selectedId: null,
    setSelectedId: () => undefined,
    producerIds: ['left', 'right', 'join', 'first', 'second'],
    consumedProducerIds: state.consumedProducerIds ?? [],
  });
}

describe('staged operation commands', () => {
  it('does not publish another graph for a repeated connection', () => {
    const operations: readonly CanvasStagedOperation[] = [
      { id: 'first', operation: 'field_transform', inputs: ['left'] },
    ];
    const state = { operations };
    actionsFor(state).connect('first', 0, 'left');
    expect(state.operations).toBe(operations);
  });

  it('removing a producer invalidates every consumer before detaching its direct inputs', async () => {
    const document = connectedNamesProjectionDraft();
    const session = new CanvasRelationAnalysisSession('remove-chain');
    try {
      session.receive(document);
      const producer: CanvasStagedOperation = {
        id: session.rootId,
        operation: 'field_transform',
        inputs: session.locate(session.rootId, session.revision).inputs,
        semanticDocument: encodeDvtSubstraitSemanticDocument(document),
      };
      const consumer = await configureCanvasStagedTransform(
        { id: 'consumer', operation: 'field_transform', inputs: [producer.id] },
        document
      );
      const terminal = await configureCanvasStagedTransform(
        { id: 'terminal', operation: 'field_transform', inputs: [consumer.id] },
        decodeCanvasStagedOperation(consumer)
      );
      const unrelated: CanvasStagedOperation = {
        id: 'unrelated',
        operation: 'filter',
        inputs: [null],
      };
      const state = { operations: [producer, consumer, terminal, unrelated] };
      actionsFor(state).remove(producer.id);
      expect(state.operations.map((item) => item.id)).toEqual([
        'consumer',
        'terminal',
        'unrelated',
      ]);
      expect(state.operations[0]!.inputs).toEqual([null]);
      expect(state.operations[1]!.inputs).toEqual(['consumer']);
      for (const [index, original] of [consumer, terminal].entries()) {
        expect(state.operations[index]!.semanticDocument).toBeUndefined();
        expect(state.operations[index]!.configurationDocument).toBe(original.semanticDocument);
      }
      expect(state.operations[2]).toBe(unrelated);
    } finally {
      session.dispose();
    }
  });

  it('does not invalidate configured consumers when a disconnect is rejected', async () => {
    const document = connectedNamesProjectionDraft();
    const session = new CanvasRelationAnalysisSession('invalid-disconnect');
    try {
      session.receive(document);
      const producer: CanvasStagedOperation = {
        id: session.rootId,
        operation: 'field_transform',
        inputs: session.locate(session.rootId, session.revision).inputs,
        semanticDocument: encodeDvtSubstraitSemanticDocument(document),
      };
      const consumer = await configureCanvasStagedTransform(
        { id: 'consumer', operation: 'field_transform', inputs: [producer.id] },
        document
      );
      expect(consumer.semanticDocument).toBeDefined();
      const operations = [producer, consumer];
      const state = { operations };
      const actions = actionsFor(state);
      for (const port of [-1, NaN, 0.5, 1]) {
        actions.disconnect(producer.id, port);
        expect(state.operations).toBe(operations);
        expect(state.operations[1]).toBe(consumer);
      }
      actions.disconnect('missing', 0);
      expect(state.operations).toBe(operations);
    } finally {
      session.dispose();
    }
  });

  it('connects both JOIN ports atomically in either order', () => {
    const state = {
      operations: [
        { id: 'join', operation: 'inner_join', inputs: [null, null] },
      ] satisfies readonly CanvasStagedOperation[],
    };
    const actions = actionsFor(state);

    actions.connect('join', 1, 'right');
    actions.connect('join', 0, 'left');

    expect(state.operations[0]?.inputs).toEqual(['left', 'right']);
  });

  it('requires separate instances for the two JOIN ports', () => {
    const state = {
      operations: [
        { id: 'join', operation: 'inner_join', inputs: [null, null] },
      ] satisfies readonly CanvasStagedOperation[],
    };
    const actions = actionsFor(state);

    actions.connect('join', 1, 'left');
    actions.connect('join', 0, 'left');

    expect(state.operations[0]?.inputs).toEqual([null, 'left']);
    actions.connect('join', 0, 'right');
    expect(state.operations[0]?.inputs).toEqual(['right', 'left']);
  });

  it('rejects fan-out across operations and frees an instance on disconnect', () => {
    const state = {
      operations: [
        { id: 'first', operation: 'filter', inputs: [null] },
        { id: 'second', operation: 'aggregate', inputs: [null] },
      ] satisfies readonly CanvasStagedOperation[],
    };
    const actions = actionsFor(state);
    actions.connect('first', 0, 'left');
    actions.connect('second', 0, 'left');
    expect(state.operations.map((operation) => operation.inputs)).toEqual([['left'], [null]]);
    actions.disconnect('first', 0);
    actions.connect('second', 0, 'left');
    expect(state.operations.map((operation) => operation.inputs)).toEqual([[null], ['left']]);
  });

  it('reserves instances consumed by the canonical tree or terminal Output', () => {
    const state = {
      operations: [
        { id: 'join', operation: 'inner_join', inputs: [null, null] },
      ] satisfies readonly CanvasStagedOperation[],
      consumedProducerIds: ['left'],
    };
    actionsFor(state).connect('join', 0, 'left');
    expect(state.operations[0]?.inputs).toEqual([null, null]);
    state.consumedProducerIds = [];
    actionsFor(state).connect('join', 0, 'left');
    expect(state.operations[0]?.inputs).toEqual(['left', null]);
  });

  it('preserves an occupied port and rejects a cycle', () => {
    const state = {
      operations: [
        { id: 'first', operation: 'filter', inputs: ['left'] },
        { id: 'second', operation: 'aggregate', inputs: ['first'] },
      ] satisfies readonly CanvasStagedOperation[],
    };
    const actions = actionsFor(state);

    actions.connect('first', 0, 'right');
    actions.connect('first', 0, 'second');

    expect(state.operations).toEqual([
      { id: 'first', operation: 'filter', inputs: ['left'] },
      { id: 'second', operation: 'aggregate', inputs: ['first'] },
    ]);
  });

  it('edits a producer in its connected document without resetting consumer aliases', async () => {
    const document = connectedNamesProjectionDraft();
    const session = new CanvasRelationAnalysisSession('staged-chain');
    session.receive(document);
    const producerId = session.rootId;
    const producer: CanvasStagedOperation = {
      id: producerId,
      operation: 'field_transform',
      inputs: session.locate(producerId, session.revision).inputs,
      semanticDocument: encodeDvtSubstraitSemanticDocument(document),
    };
    const consumer = await configureCanvasStagedTransform(
      { id: 'pending-operation:consumer', operation: 'field_transform', inputs: [producerId] },
      document
    );
    session.receive(decodeCanvasStagedOperation(consumer));
    await changeSelectedRelationOutputs(session, {
      relationId: consumer.id,
      expectedRevision: session.revision,
      outputs: [0, 1].map((slot) => ({ slot, alias: `retained_${slot}` })),
    });
    const capability = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['string'],
      provider: 'postgres',
      resolution: 'complete',
    }).find((entry) => entry.name === 'upper')!;
    const configured = await applySelectedRelationDerivedOutput(session, {
      relationId: consumer.id,
      expectedRevision: session.revision,
      intent: 'edit',
      alias: 'retained_derived',
      capabilityIds: [capability.capabilityId],
      operandFieldIds: [(await session.query(consumer.id)).bindings[0]!.fieldId],
    });
    const state = {
      operations: [
        producer,
        { ...consumer, semanticDocument: encodeDvtSubstraitSemanticDocument(configured) },
      ],
    };
    session.receive(resolveCanvasStagedEditingDocument(producer, state.operations));
    const renamed = await changeSelectedRelationOutputs(session, {
      relationId: producerId,
      expectedRevision: session.revision,
      outputs: [0, 1].map((slot) => ({ slot, alias: `renamed_${slot}` })),
    });
    actionsFor(state).updateConfiguration(producerId, {
      operation: 'field_transform',
      semanticDocument: encodeDvtSubstraitSemanticDocument(renamed),
    });
    const saved = decodeCanvasStagedOperation(state.operations[1]);
    expect(
      saved?.sidecar.fields
        .filter((field) => field.relationId === consumer.id)
        .map((field) => field.displayName)
    ).toEqual(['retained_0', 'retained_1', 'retained_derived']);
    session.receive(saved);
    expect(session.rootId).toBe(consumer.id);
    const accepted = state.operations;
    expect(
      actionsFor(state).updateConfiguration(producerId, {
        operation: 'field_transform',
        semanticDocument: producer.semanticDocument,
      })
    ).toBe(false);
    expect(state.operations).toBe(accepted);
    const revision = session.revision;
    await expect(
      changeSelectedRelationOutputs(session, {
        relationId: producerId,
        expectedRevision: revision,
        outputs: [{ slot: 0, alias: 'renamed_0' }],
      })
    ).rejects.toThrow();
    expect(session.revision).toBe(revision);
    session.dispose();
  });
});
