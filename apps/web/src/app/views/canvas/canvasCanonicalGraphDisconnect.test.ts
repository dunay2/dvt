import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { disconnectCanvasCanonicalGraph } from './canvasCanonicalGraphDisconnect';
import { projectCanvasStagedOperation } from './canvasStagedOperationProjection';
import { restoreCanvasOperationConfiguration } from './canvasRetainedOperationConfiguration';
import {
  decodeCanvasStagedOperation,
  projectCanvasStagedDocument,
} from './canvasStagedOperationDocument';
import { createCanvasRelationalAuthoringDraft } from './canvasRelationalAuthoringDraft';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';
import { createCanvasRelationalTreeApplyDraft } from './canvasRelationalTreeApplyDraft';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { graphModel, graphJoin } from './canvasRelationGraph.test-support';
import { createCanvasCanonicalGraphDisconnectCommand } from './canvasCanonicalGraphDisconnectCommand';
import { vi } from 'vitest';

describe('canonical graph disconnection', () => {
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

  it('does not start or mutate a read-only session', () => {
    const { document, session } = graphJoin();
    const write = vi.fn();
    const start = vi.fn(() => true);
    createCanvasCanonicalGraphDisconnectCommand({
      editable: false,
      analysis: { document, session, revision: session.revision, error: null, refresh: vi.fn() },
      start,
      sourceNodeIds: ['left', 'right'],
      state: {
        setJoinDraft: write,
        setOperation: write,
        setPendingSources: write,
        setStagedOperations: write,
        setSelectedStagedOperationId: write,
      },
    })(session.rootId, 0);
    expect(write).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    session.dispose();
  });
  it.each(['failed', 'stale', 'disposed'])('does not mutate a %s analysis session', (condition) => {
    const { document, session } = graphJoin();
    const revision = condition === 'stale' ? session.revision - 1 : session.revision;
    if (condition === 'disposed') session.dispose();
    const write = vi.fn();
    const start = vi.fn(() => true);
    createCanvasCanonicalGraphDisconnectCommand({
      editable: true,
      analysis: {
        document,
        session,
        revision,
        error: condition === 'failed' ? new Error('analysis failed') : null,
        refresh: vi.fn(),
      },
      start,
      sourceNodeIds: ['left', 'right'],
      state: {
        setJoinDraft: write,
        setOperation: write,
        setPendingSources: write,
        setStagedOperations: write,
        setSelectedStagedOperationId: write,
      },
    })(document.sidecar.relations.at(-1)!.relationId, 0);
    expect(write).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    session.dispose();
  });
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

  it('invalidates the consumer chain and refuses stale producer content on reconnect', async () => {
    const producer = connectedNamesProjectionDraft();
    const index = indexSubstraitRelations(producer);
    if (!index.ok) throw index.error;
    const configured = await configureCanvasStagedTransform(
      { id: 'outer', operation: 'field_transform', inputs: [index.index.rootId] },
      producer
    );
    const complete = decodeCanvasStagedOperation(configured)!;
    const detached = disconnectCanvasCanonicalGraph(complete, index.index.rootId, 0, [
      'source-people',
    ])!;
    expect(
      detached.operations.every(
        (operation) => operation.semanticDocument == null && operation.configurationDocument != null
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
  });

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
});
