import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import {
  disconnectCanvasCanonicalGraph,
  projectCanvasCanonicalGraphEditing,
} from './canvasCanonicalGraphEditing';
import { projectCanvasStagedOperation } from './canvasStagedOperationProjection';
import { restoreCanvasOperationConfiguration } from './canvasRetainedOperationConfiguration';
import {
  decodeCanvasStagedOperation,
  assignCanvasStagedRoot,
  projectCanvasStagedDocument,
} from './canvasStagedOperationDocument';
import { createCanvasRelationalAuthoringDraft } from './canvasRelationalAuthoringDraft';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import { createCanvasRelationalTreeApplyDraft } from './canvasRelationalTreeApplyDraft';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { graphModel, graphJoin } from './canvasRelationGraph.test-support';
import { createCanvasCanonicalGraphEditingCommands } from './canvasCanonicalGraphEditingCommand';
import { vi } from 'vitest';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { configureCanvasStagedComposition } from './canvasStagedCompositionConfiguration';
import { createSourceDocument } from './canvasSourceDocument';
import { source } from './canvasRelationalOperator.test-support';
import { canvasCanonicalProducerIdentity } from './canvasCanonicalProducerIdentity';
import { disconnectCanvasStagedOperation } from './canvasStagedOperation';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  withPublicExpressionStage,
  withScalarOutput,
} from './canvasRelationalExpressionStage.test-support';

describe('canonical graph disconnection', () => {
  it('disconnects and restores a grouped Transform through its external input only', async () => {
    const document = await withPublicExpressionStage(withScalarOutput(), true);
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    const input = [...indexed.index.relations.values()].find(
      (entry) => entry.relation.relType.case === 'read'
    )!;
    const graph = projectCanvasCanonicalGraphEditing(document, ['customers'])!;
    expect(graph.operations).toHaveLength(1);
    expect(graph.operations[0]).toMatchObject({
      id: 'public-transform',
      inputs: [input.binding.relationId],
    });
    const detached = disconnectCanvasCanonicalGraph(document, 'public-transform', 0, [
      'customers',
    ])!;
    expect(detached.operations).toHaveLength(1);
    const pending = detached.operations[0]!;
    expect(pending.inputs).toEqual([null]);
    expect(pending.semanticDocument).toBeUndefined();
    expect(pending.configurationDocument).toEqual(encodeDvtSubstraitSemanticDocument(document));
    const producer = projectCanvasStagedDocument(document, input.binding.relationId)!;
    const restored = restoreCanvasOperationConfiguration(
      { ...pending, inputs: [input.binding.relationId] },
      [producer]
    );
    expect(restored.semanticDocument).toEqual(encodeDvtSubstraitSemanticDocument(document));
    expect(restored.configurationDocument).toBeUndefined();
    const changed = structuredClone(producer);
    changed.sidecar.fields[0]!.displayName = 'changed';
    expect(
      restoreCanvasOperationConfiguration({ ...pending, inputs: [input.binding.relationId] }, [
        changed,
      ]).semanticDocument
    ).toBeUndefined();
  });

  it('reassigns the public root without orphaning internal authoring bindings', async () => {
    const document = await withPublicExpressionStage(withScalarOutput(), true);
    const renamed = assignCanvasStagedRoot(document, 'renamed-transform');
    expect(
      renamed.sidecar.relations
        .filter((binding) => binding.authoringOwnerRelationId != null)
        .map((binding) => binding.authoringOwnerRelationId)
    ).toEqual(['renamed-transform']);
    const indexed = indexSubstraitRelations(renamed);
    expect(indexed.ok).toBe(true);
    if (!indexed.ok) throw indexed.error;
    expect(indexed.index.rootId).toBe('renamed-transform');
    expect(renamed.plan).toBe(document.plan);
    expect(renamed.sidecar.fields.map((field) => field.fieldId)).toEqual(
      document.sidecar.fields.map((field) => field.fieldId)
    );
  });

  it.each([0, 1])('disconnects only JOIN port %s and retains its exact predicate', (port) => {
    const { document, session } = graphJoin();
    const previousInputs = session.locate(session.rootId, session.revision).inputs;
    const detached = disconnectCanvasCanonicalGraph(document, session.rootId, port, [
      'left',
      'right',
    ])!;
    expect(detached.operations[0]!.inputs).toEqual(
      previousInputs.map((input, ordinal) => (ordinal === port ? null : input))
    );
    expect(detached.operations[0]!.configurationDocument).toEqual(
      encodeDvtSubstraitSemanticDocument(document)
    );
    expect(detached.sources).toHaveLength(2);
    session.dispose();
  });

  it.each(['current', 'read-only', 'failed', 'stale', 'disposed'])(
    'admits both topology commands only for a current writable session: %s',
    (condition) => {
      const sample = source('places');
      const input = {
        ...sample,
        fields: sample.fields.map((field) => ({
          name: field.name,
          dataType: field.type,
          joinDataType: field.type,
        })),
      };
      const sources = Array.from({ length: 3 }, () => createPendingSourceOccurrence(input));
      const ids = sources.map((entry) => entry.read.binding.relationId);
      const configured = configureCanvasStagedComposition(
        { id: 'union', operation: 'union_all', inputs: ids.slice(0, 2) },
        [input],
        sources,
        []
      );
      const document = decodeCanvasStagedOperation(configured)!;
      const session = new CanvasRelationAnalysisSession('topology-admission');
      session.receive(document);
      const revision = condition === 'stale' ? session.revision - 1 : session.revision;
      if (condition === 'disposed') session.dispose();
      const write = vi.fn();
      const start = vi.fn(() => true);
      const commands = createCanvasCanonicalGraphEditingCommands({
        editable: condition !== 'read-only',
        analysis: {
          document,
          session,
          revision,
          error: condition === 'failed' ? new Error('analysis failed') : null,
          refresh: vi.fn(),
        },
        start,
        sourceNodeIds: [input.nodeId, input.nodeId],
        state: {
          setJoinDraft: write,
          setOperation: write,
          setPendingSources: write,
          setStagedOperations: write,
          setSelectedStagedOperationId: write,
        },
      });
      const scope = { editable: true, producerIds: ids, consumedProducerIds: [] };
      for (const command of [
        (): void => commands.disconnect('union', 0),
        (): void => commands.connect('union', 2, ids[2]!, scope, []),
      ]) {
        command();
        expect(start).toHaveBeenCalledTimes(condition === 'current' ? 1 : 0);
        expect(write).toHaveBeenCalledTimes(condition === 'current' ? 5 : 0);
        start.mockClear();
        write.mockClear();
      }
      session.dispose();
    }
  );
  it('retains operation identity and configuration without advertising executable output', () => {
    const document = connectedNamesProjectionDraft();
    const index = indexSubstraitRelations(document);
    if (!index.ok) throw index.error;
    const rootId = index.index.rootId;
    const result = disconnectCanvasCanonicalGraph(document, rootId, 0, ['source-people']);
    expect(result).not.toBeNull();
    const operation = result!.operations.find((entry) => entry.id === rootId)!;
    expect(operation.inputs).toEqual([null]);
    expect(operation.semanticDocument).toBeUndefined();
    expect(operation.configurationDocument).toBeDefined();
    expect(projectCanvasStagedOperation(operation).output.fields).toEqual([]);
    expect(decodeCanvasStagedOperation(operation)).toBeNull();
    expect(
      createCanvasRelationalAuthoringDraft({
        ...result!,
        outputRelationId: rootId,
        positions: new Map(),
      }).operations[0]?.configurationDocument
    ).toEqual(operation.configurationDocument);

    const producerId = index.index.relations.get(rootId)!.inputs[0]!;
    const producer = projectCanvasStagedDocument(document, producerId)!;
    const reconnected = restoreCanvasOperationConfiguration(
      { ...operation, inputs: [producerId] },
      [producer]
    );
    expect(encodeDvtSubstraitSemanticDocument(decodeCanvasStagedOperation(reconnected)!)).toEqual(
      encodeDvtSubstraitSemanticDocument(document)
    );
    expect(reconnected.configurationDocument).toBeUndefined();
    expect(
      restoreCanvasOperationConfiguration({ ...operation, inputs: ['foreign'] }, [producer])
        .semanticDocument
    ).toBeUndefined();
  });

  it.each([-1, 0.5, NaN, 1])(
    'rejects invalid input port %s without changing the document',
    (port) => {
      const document = connectedNamesProjectionDraft();
      const before = document.sidecar;
      const index = indexSubstraitRelations(document);
      if (!index.ok) throw index.error;
      expect(
        disconnectCanvasCanonicalGraph(document, index.index.rootId, port, ['source-people'])
      ).toBeNull();
      expect(document.sidecar).toBe(before);
    }
  );

  it.each([false, true])(
    'invalidates the consumer chain and refuses stale producer content on reconnect (grouped=%s)',
    async (grouped) => {
      const producer = grouped
        ? await withPublicExpressionStage(withScalarOutput(), true)
        : connectedNamesProjectionDraft();
      const index = indexSubstraitRelations(producer);
      if (!index.ok) throw index.error;
      const configured = await configureCanvasStagedTransform(
        { id: 'outer', operation: 'field_transform', inputs: [index.index.rootId] },
        producer
      );
      const complete = decodeCanvasStagedOperation(configured)!;
      const detached = disconnectCanvasCanonicalGraph(complete, index.index.rootId, 0, [
        grouped ? 'customers' : 'source-people',
      ])!;
      expect(
        detached.operations.every(
          (operation) =>
            operation.semanticDocument == null && operation.configurationDocument != null
        )
      ).toBe(true);
      const outer = detached.operations.find((operation) => operation.id === 'outer')!;
      expect(restoreCanvasOperationConfiguration(outer, [null])).toBe(outer);
      const renamed = structuredClone(producer);
      renamed.sidecar.fields[0]!.displayName = 'changed';
      expect(restoreCanvasOperationConfiguration(outer, [renamed])).toBe(outer);
      expect(restoreCanvasOperationConfiguration(outer, [producer]).semanticDocument).toEqual(
        configured.semanticDocument
      );
    }
  );

  it('Apply withdraws old semantic authority and preserves the disconnected topology', () => {
    const document = connectedNamesProjectionDraft();
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    const detached = disconnectCanvasCanonicalGraph(document, indexed.index.rootId, 0, [
      'source-people',
    ])!;
    const relationalAuthoringDraft = createCanvasRelationalAuthoringDraft({
      ...detached,
      outputRelationId: indexed.index.rootId,
      positions: new Map(),
    });
    const node = graphModel(document);
    const changed = applyCanvasInspectorNodeDraft(
      node,
      createCanvasRelationalTreeApplyDraft({
        transformNode: node,
        relationalAuthoringDraft,
        joinDraft: null,
        operation: null,
      })
    );
    expect(readDvtTransformAuthoringAuthority(changed)).toBeNull();
    expect(changed.metadata?.relationalAuthoringDraft).toEqual(relationalAuthoringDraft);
    expect(relationalAuthoringDraft.operations[0]!.inputs).toEqual([null]);
    expect(relationalAuthoringDraft.operations[0]!.configurationDocument).toBeDefined();
  });
  it('restores a staged JOIN across composition-local anchors and consumer-only functions', () => {
    const inputs = ['left', 'right'].map((name) => ({
      ...source(name),
      fields: source(name).fields.map((field) => ({
        name: field.name,
        dataType: field.type,
        joinDataType: field.type,
      })),
    }));
    const sources = inputs.map(createPendingSourceOccurrence);
    const configured = configureCanvasStagedComposition(
      {
        id: 'join',
        operation: 'inner_join',
        inputs: sources.map((entry) => entry.read.binding.relationId),
      },
      inputs,
      sources,
      []
    );
    expect(configured.semanticDocument).toBeDefined();
    const detached = disconnectCanvasStagedOperation(configured, 1);
    const producers = sources.map((entry) => createSourceDocument([entry.read], entry.read));
    expect(
      restoreCanvasOperationConfiguration({ ...detached, inputs: configured.inputs }, producers)
        .semanticDocument
    ).toEqual(configured.semanticDocument);
  });
  it('does not equate different used function identities', () => {
    const { document, session } = graphJoin();
    const changed = structuredClone(document);
    const extension = changed.plan.extensions.find(
      (entry) => entry.mappingType.case === 'extensionFunction'
    )!;
    if (extension.mappingType.case !== 'extensionFunction')
      throw new Error('Missing fixture function');
    extension.mappingType.value.name = 'not_equal';
    const identity = canvasCanonicalProducerIdentity(document);
    expect(identity).not.toBeNull();
    expect(canvasCanonicalProducerIdentity(changed)).not.toEqual(identity);
    session.dispose();
  });
});
