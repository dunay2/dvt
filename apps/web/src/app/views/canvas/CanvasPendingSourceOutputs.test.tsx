// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';
import {
  CanvasPendingSourceInspector,
  CanvasPendingSourceOutputs,
} from './CanvasPendingSourceOutputs';
import {
  createPendingSourceOccurrence,
  type PendingSourceOccurrence,
} from './relational-source-occurrence/pendingSourceOccurrence';
import {
  occurrenceGraph,
  occurrenceInput,
} from './relational-source-occurrence/occurrence.test.fixtures';
import { setupWorkbenchTest, root, container } from './CanvasRelationalTreeWorkbench.test-support';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { initializeCanvasSourceOutputs } from './canvasSourceOutputDefaults';
import { readCanvasDvtCompositionInputCatalog } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasReadFieldEligibility } from './canvasInputFieldEligibility';
import { createCanvasStagedOperationActions } from './canvasStagedOperationActions';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { insertSelectedRelationTransform } from './canvasSelectedRelationTransform';

async function configuredSourceFixture(ancestor: boolean): Promise<
  Readonly<{
    graph: ReturnType<typeof occurrenceGraph>;
    document: SubstraitDocument;
    occurrence: PendingSourceOccurrence;
    operations: readonly CanvasStagedOperation[];
    rootId: string;
  }>
> {
  const graph = occurrenceGraph();
  const index = indexSubstraitRelations(graph.draft);
  if (!index.ok) throw index.error;
  const read = [...index.index.relations.values()].find(
    (entry) => entry.relation.relType.case === 'read'
  );
  if (read?.binding.displayName == null) throw new Error('Expected a named Source.');
  const occurrence: PendingSourceOccurrence = {
    sourceNodeId: graph.source.id,
    read: { ...read, binding: { ...read.binding, displayName: read.binding.displayName } },
  };
  const session = new CanvasRelationAnalysisSession('configured-source-fixture');
  let document = graph.draft;
  try {
    session.receive(document);
    if (ancestor)
      document = (
        await insertSelectedRelationTransform(session, {
          relationId: session.rootId,
          expectedRevision: session.revision,
        })
      ).document;
    document = (
      await initializeCanvasSourceOutputs({
        document,
        sources: [{ ...occurrence, initialOutputFieldIds: [read.fields[0]!.fieldId] }],
      })
    ).document;
    const configured = indexSubstraitRelations(document);
    if (!configured.ok) throw configured.error;
    const join: CanvasStagedOperation = {
      id: index.index.rootId,
      operation: 'left_join',
      inputs: [...index.index.relations.values()]
        .filter((entry) => entry.relation.relType.case === 'read')
        .map((entry) => entry.binding.relationId),
      semanticDocument: encodeDvtSubstraitSemanticDocument(ancestor ? graph.draft : document),
    };
    const operations: readonly CanvasStagedOperation[] = ancestor
      ? [
          join,
          {
            id: configured.index.rootId,
            operation: 'field_transform',
            inputs: [join.id],
            semanticDocument: encodeDvtSubstraitSemanticDocument(document),
          },
        ]
      : [join];
    return { graph, document, occurrence, operations, rootId: configured.index.rootId };
  } finally {
    session.dispose();
  }
}

async function outputWidth(document: SubstraitDocument): Promise<number> {
  const session = new CanvasRelationAnalysisSession('pending-source-output-oracle');
  try {
    session.receive(document);
    return (await session.query(null)).fields.length;
  } finally {
    session.dispose();
  }
}

describe('pending occurrence Output adapter', () => {
  setupWorkbenchTest();
  it.each(['terminal', 'staged', 'ancestor', 'canonical'] as const)(
    'retains configured Source selection through its %s document owner',
    async (owner) => {
      const fixture = await configuredSourceFixture(owner === 'ancestor');
      const { inputs } = readCanvasDvtCompositionInputCatalog({
        targetNodeId: fixture.graph.targetNode.id,
        nodes: fixture.graph.nodes,
        edges: fixture.graph.edges,
      });
      const binding = {
        inputs,
        readFieldEligibility: (document: SubstraitDocument) =>
          resolveCanvasReadFieldEligibility({
            document,
            nodeId: fixture.graph.targetNode.id,
            nodes: fixture.graph.nodes,
            edges: fixture.graph.edges,
          }),
      };
      const preference = vi.fn(() => false);
      const canonicalChange = vi.fn();
      const configurationChange = vi.fn();
      let accepted: SubstraitDocument | null = null;
      function Host(): JSX.Element {
        const [draft, setDraft] = useState(owner === 'canonical' ? fixture.document : null);
        const [operations, setOperations] = useState(
          owner === 'canonical' ? [] : fixture.operations
        );
        const staged = createCanvasStagedOperationActions({
          editable: true,
          start: () => true,
          operations,
          setOperations,
          selectedId: null,
          setSelectedId: () => {},
          producerIds: [],
          consumedProducerIds: [],
        });
        return (
          <CanvasPendingSourceInspector
            data={{
              draft,
              stagedOperations: operations,
              pendingSources: [fixture.occurrence],
              inputs,
              analysisBinding: binding,
              outputRelationId: owner === 'terminal' ? fixture.rootId : null,
            }}
            actions={{
              setPendingOutputIncluded: preference,
              renamePending: () => false,
              changeDraft: (document) => {
                canonicalChange(document);
                accepted = document;
                setDraft(document);
              },
              updateStagedOperation: (id, update) => {
                configurationChange(id, update);
                const result = staged.updateConfiguration(id, update);
                if (result && update !== 'reconfigure' && update.semanticDocument != null)
                  accepted = decodeDvtSubstraitSemanticDocument(update.semanticDocument);
                return result;
              },
            }}
            occurrence={fixture.occurrence}
            publishedFieldNames={['id', 'parent_id']}
            onClose={() => {}}
            onPendingChange={() => {}}
          />
        );
      }
      await act(async () => root.render(<Host />));
      const fields = fixture.occurrence.read.fields.filter((field) => field.parentFieldId == null);
      expect(
        container.querySelectorAll('[data-slot="source-occurrence-output-field"]')
      ).toHaveLength(1);
      await act(async () =>
        fireEvent.click(container.querySelector('[data-slot="canvas-relational-edit"]')!)
      );
      const add = container.querySelector<HTMLButtonElement>(
        `[data-slot="source-occurrence-add-field"][data-field-name="${fields[1]!.displayName}"]`
      )!;
      expect(add).not.toBeNull();
      expect(add.disabled).toBe(false);
      await act(async () => fireEvent.click(add));
      expect(preference).not.toHaveBeenCalled();
      if (owner === 'canonical') {
        expect(canonicalChange).toHaveBeenCalledOnce();
        expect(configurationChange).not.toHaveBeenCalled();
        expect(await outputWidth(accepted!)).toBe(4);
      } else {
        expect(configurationChange).toHaveBeenCalledOnce();
        expect(configurationChange.mock.calls[0]![0]).toBe(fixture.rootId);
        expect(canonicalChange).not.toHaveBeenCalled();
        expect(
          container.querySelectorAll('[data-slot="source-occurrence-remove-field"]')
        ).toHaveLength(2);
        expect(await outputWidth(accepted!)).toBe(4);
      }
    }
  );

  it('disables consumed preferences when only non-executable configuration remains', async () => {
    const fixture = await configuredSourceFixture(false);
    const input = {
      ...occurrenceInput.source,
      fields: occurrenceInput.fields.map((name) => ({
        name,
        dataType: 'bigint',
        joinDataType: 'i64' as const,
      })),
    };
    const change = vi.fn();
    await act(async () =>
      root.render(
        <CanvasPendingSourceOutputs
          occurrence={fixture.occurrence}
          input={input}
          publishedFieldNames={['id', 'parent_id']}
          editing
          document={null}
          binding={{
            inputs: [input],
            readFieldEligibility: () => ({ denied: new Set(), disconnected: new Set() }),
          }}
          onChange={change}
          onCanonicalChange={vi.fn()}
        />
      )
    );
    const toggles = [...container.querySelectorAll<HTMLButtonElement>('[data-field-name]')];
    expect(toggles).toHaveLength(2);
    expect(toggles.every((toggle) => toggle.disabled)).toBe(true);
    await act(async () => toggles[0]!.click());
    expect(change).not.toHaveBeenCalled();
  });
  it('changes local Read identity and recovers an excluded field only while editing', async () => {
    const input = {
      ...occurrenceInput.source,
      fields: occurrenceInput.fields.map((name) => ({
        name,
        dataType: 'bigint',
        joinDataType: 'i64' as const,
      })),
    };
    const occurrence = createPendingSourceOccurrence(input);
    const field = occurrence.read.fields[0]!;
    const change = vi.fn();
    const props = {
      occurrence: { ...occurrence, initialOutputFieldIds: [] },
      input,
      publishedFieldNames: ['id', 'parent_id'],
      document: null,
      binding: {
        inputs: [input],
        readFieldEligibility: () => ({
          denied: new Set<string>(),
          disconnected: new Set<string>(),
        }),
      },
      onChange: change,
      onCanonicalChange: vi.fn(),
    };
    await act(async () => root.render(<CanvasPendingSourceOutputs {...props} editing={false} />));
    expect(container.querySelector('button')).toBeNull();
    expect(container.textContent).not.toContain('parent_id');
    await act(async () => root.render(<CanvasPendingSourceOutputs {...props} editing />));
    const toggle = container.querySelector<HTMLButtonElement>(
      `[data-field-name="${field.displayName}"]`
    )!;
    expect(toggle).not.toBeNull();
    await act(async () => fireEvent.click(toggle));
    expect(change).toHaveBeenCalledExactlyOnceWith(field.fieldId, true);
  });
});
