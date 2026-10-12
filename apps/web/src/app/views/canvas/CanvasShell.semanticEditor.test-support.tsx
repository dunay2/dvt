/** Shared production shell setup for opening and draft-protection behaviors. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, vi } from 'vitest';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import { createCanvasShellHarness, getCanvasShellState } from './CanvasShell.testHarness';
import { CanvasWorkspaceTopBarIdentity } from './CanvasWorkspaceMenuControls';

export let harness: ReturnType<typeof createCanvasShellHarness>;
export let navigation: HTMLDivElement;
let navigationRoot: Root;

export function setupSemanticEditorShell(): void {
  beforeEach(() => {
    harness = createCanvasShellHarness();
    navigation = document.createElement('div');
    document.body.appendChild(navigation);
    navigationRoot = createRoot(navigation);
    act(() => navigationRoot.render(<CanvasWorkspaceTopBarIdentity />));
  });
  afterEach(() => {
    harness.unmount();
    act(() => navigationRoot.unmount());
    navigation.remove();
  });
}

export async function mountModel(withSecondModel = false): Promise<{
  data: DbtNodeData;
  fixture: ReturnType<typeof buildSemanticWorkbenchFixture>;
  onSelectNode: ReturnType<typeof vi.fn>;
  previewTransformRows: ReturnType<typeof vi.fn>;
  onApplyNodeDraft: ReturnType<typeof vi.fn>;
}> {
  const fixture = buildSemanticWorkbenchFixture();
  const previewTransformRows = vi.fn();
  const onSelectNode = vi.fn();
  const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
  const models = [
    fixture.transform,
    ...(withSecondModel ? [{ ...fixture.transform, id: 'other-model', name: 'Other model' }] : []),
  ];
  await harness.render({
    panels: {
      inspectorGraphNodes: [...fixture.sources, ...models],
      inspectorGraphEdges: fixture.edges,
      relationalTreeAuthoring: { canEditNode: true, onApplyNodeDraft },
    },
    graph: {
      nodesWithImpact: models.map((model) => ({
        id: model.id,
        position: { x: 200, y: 140 },
        type: 'dbtNode',
        data: { ...model, pluginKind: model.kind, onSelectNode },
      })),
      viewport: { x: 40, y: 70, zoom: 0.8 },
    },
    canvasTransformDataSampleQuery: { previewTransformRows },
  });
  const data = (
    getCanvasShellState().canvasViewportProps?.nodesWithImpact as Array<{ data: DbtNodeData }>
  )[0]!.data;
  return { data, fixture, onSelectNode, previewTransformRows, onApplyNodeDraft };
}
