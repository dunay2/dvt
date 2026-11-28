// @vitest-environment jsdom
/** Connected physical Inputs own one dependency and independently editable local Reads. */
import { act, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceGraphAuthoringNodeSchema } from '@dvt/contracts';
import { screen } from '@testing-library/dom';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { createTestQueryClient } from '../../../testing/reactQueryHarness';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { projectAuthoringNodeToCanonical } from '../../services/workspace/workspaceGraphDraftProjection';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasModelBrowserProvider } from './CanvasModelBrowser';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { useCanvasExplorerCatalogPresentation } from './explorer/useCanvasExplorerCatalogPresentation';
import { CANVAS_MODEL_COMPOSITION_DRAG_MIME_TYPE } from './canvasNodeDropPayload';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import {
  setupWorkbenchTest,
  COPY,
  container,
  root,
  sourceNode,
  transformNode,
  edge,
} from './CanvasRelationalTreeWorkbench.test-support';
import {
  connectStagedWorkbenchBinaryOperation,
  connectWorkbenchOutput,
  stageWorkbenchOperation,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';

type PhysicalGraph = Readonly<{
  source: CanonicalNode;
  target: CanonicalNode;
  edges: ReturnType<typeof edge>[];
}>;

function emptyPhysicalGraph(): PhysicalGraph {
  const source = sourceNode('calendar', 'sales_calendar');
  return { source, target: transformNode(), edges: [edge(source.id)] };
}

function physicalScenario(
  graph: PhysicalGraph,
  editable = true
): Readonly<{
  apply: Mock<CanvasRelationalTreeAuthoringContract['onApplyNodeDraft']>;
  saved: () => CanonicalNode;
  render: (key?: string) => Promise<void>;
}> {
  let saved = graph.target;
  const apply = vi.fn<CanvasRelationalTreeAuthoringContract['onApplyNodeDraft']>();
  const client = createTestQueryClient();
  const services = {
    ...createAppServicesTestOverrides(),
    workspaceFilesQuery: { listFiles: async () => [], getFileContent: vi.fn() },
  };
  function Host(): JSX.Element {
    const [node, setNode] = useState(saved);
    const nodes = [graph.source, node];
    const cataloguePresentation = useCanvasExplorerCatalogPresentation('physical-test');
    apply.mockImplementation((_id, draft) => {
      saved = applyCanvasInspectorNodeDraft(node, draft);
      setNode(saved);
      return { outcome: 'no_changes' };
    });
    const navigation = {
      scopeKey: 'physical-test',
      mode: 'semantic' as const,
      cataloguePresentation,
      onBrowse: vi.fn(),
      onSelect: vi.fn(() => false),
      contexts: [],
      selectContext: vi.fn(),
      cancelContext: vi.fn(),
    };
    return (
      <QueryClientProvider client={client}>
        <AppServicesProvider overrides={services}>
          <CanvasModelBrowserProvider navigation={navigation} selectedId={node.id} active>
            <CanvasRelationalTreeWorkbench
              transformNode={node}
              nodes={nodes}
              edges={graph.edges}
              copy={COPY}
              authoring={{ canEditNode: editable, onApplyNodeDraft: apply }}
            />
          </CanvasModelBrowserProvider>
        </AppServicesProvider>
      </QueryClientProvider>
    );
  }
  return {
    apply,
    saved: () => saved,
    render: async (key = 'initial') => {
      await act(async () => root.render(<Host key={key} />));
    },
  };
}

async function dropPhysicalSource(id: string, scopeKey = 'physical-test'): Promise<void> {
  const event = new MouseEvent('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      types: [CANVAS_MODEL_COMPOSITION_DRAG_MIME_TYPE],
      getData: () => JSON.stringify({ id, scopeKey }),
    },
  });
  const surface = container.querySelector('[data-slot="canvas-relational-tree-surface"]');
  expect(surface).not.toBeNull();
  await act(async () => surface!.dispatchEvent(event));
}

function pendingReads(): ReadonlyArray<
  Readonly<{ id: string | null; alias: string | null | undefined }>
> {
  return [...container.querySelectorAll('[data-pending="true"][data-operator="read"]')].map(
    (card) => ({
      id: card.getAttribute('data-relation-id'),
      alias: card.querySelector('[data-slot="canvas-relational-node-title"]')?.textContent,
    })
  );
}

async function clickAction(name: string): Promise<void> {
  const button = screen.getByRole('button', { name });
  expect(button).toHaveProperty('disabled', false);
  await act(async () => button.click());
}

describe('Explorer physical Input occurrences', () => {
  setupWorkbenchTest();

  it('adds two Reads of a connected Source by dropping, then applies and reopens a self-join', async () => {
    useApplicationLanguageStore.setState({ language: 'es' });
    const graph = emptyPhysicalGraph(),
      before = structuredClone(graph);
    const scenario = physicalScenario(graph);
    await scenario.render();
    const sourceRow = container.querySelector(
      `[data-slot="canvas-relational-tree-source"][data-node-id="${graph.source.id}"]`
    );
    expect(sourceRow?.getAttribute('draggable')).toBe('true');
    expect(container.querySelector('[data-slot="canvas-explorer-models"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Añadir modelo' })).toBeNull();
    await dropPhysicalSource(graph.source.id);
    await dropPhysicalSource(graph.source.id);
    const pending = pendingReads();
    expect(pending).toHaveLength(2);
    expect(new Set(pending.map((read) => read.id)).size).toBe(2);
    expect(new Set(pending.map((read) => read.alias)).size).toBe(2);
    expect(graph).toEqual(before);
    expect(scenario.apply).not.toHaveBeenCalled();
    await stageWorkbenchOperation('cross-join');
    await connectStagedWorkbenchBinaryOperation();
    const join = container.querySelector('[data-pending-operation="true"] [data-operator="cross"]');
    expect(join).not.toBeNull();
    const output = join!.parentElement!.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-output-port"]'
    );
    expect(output).not.toBeNull();
    await connectWorkbenchOutput(container, output!);
    await clickAction('Apply');
    expect(scenario.apply).toHaveBeenCalledTimes(1);
    expect(scenario.apply.mock.calls[0]?.[2]).toBeUndefined();
    const saved = projectAuthoringNodeToCanonical(
      WorkspaceGraphAuthoringNodeSchema.parse(JSON.parse(JSON.stringify(scenario.saved())))
    );
    const document = readDvtTransformAuthoringAuthority(saved)!.semanticDocument;
    const reads = document.sidecar.relations.filter((read) => read.sourceRef != null);
    expect(reads.map((read) => read.relationId).sort()).toEqual(
      pending.map((read) => read.id).sort()
    );
    expect(reads.map((read) => read.displayName).sort()).toEqual(
      pending.map((read) => read.alias).sort()
    );
    expect(
      new Set(
        reads.flatMap((read) =>
          document.sidecar.fields
            .filter((field) => field.relationId === read.relationId)
            .map((field) => field.fieldId)
        )
      ).size
    ).toBe(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.source).toEqual(before.source);
    await scenario.render('reopened');
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    expect(scenario.apply).toHaveBeenCalledTimes(1);
  });

  it('cancels a further occurrence without changing prior aliases, Reads or the physical dependency', async () => {
    useApplicationLanguageStore.setState({ language: 'en' });
    const existing = occurrenceGraph();
    const graph = { source: existing.source, target: existing.targetNode, edges: existing.edges };
    const before = structuredClone(graph),
      scenario = physicalScenario(graph);
    await scenario.render();
    await dropPhysicalSource(graph.source.id);
    await dropPhysicalSource(graph.source.id);
    expect(pendingReads()).toHaveLength(2);
    await clickAction('Cancel');
    expect(pendingReads()).toHaveLength(0);
    expect(container.querySelectorAll('[data-operator="read"]')).toHaveLength(2);
    expect(graph).toEqual(before);
    expect(scenario.saved()).toEqual(before.target);
    expect(scenario.apply).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'keeps permission and scope admission for a connected Input (%s)',
    async (editable) => {
      const graph = emptyPhysicalGraph(),
        before = structuredClone(graph),
        scenario = physicalScenario(graph, editable);
      await scenario.render();
      await dropPhysicalSource(graph.source.id, editable ? 'foreign-scope' : 'physical-test');
      expect(pendingReads()).toHaveLength(0);
      expect(scenario.apply).not.toHaveBeenCalled();
      expect(graph).toEqual(before);
    }
  );
});
