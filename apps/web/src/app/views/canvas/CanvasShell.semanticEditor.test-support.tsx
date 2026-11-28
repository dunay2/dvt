/** Shared production shell setup for opening and draft-protection behaviors. */
import { beforeEach, afterEach, vi } from 'vitest';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';

export let harness: ReturnType<typeof createCanvasShellHarness>;
export let navigation: HTMLDivElement;

export function setupSemanticEditorShell(): void {
  beforeEach(() => {
    harness = createCanvasShellHarness();
    navigation = harness.navigation;
  });
  afterEach(() => {
    harness.unmount();
  });
}

export function readModelInputs(): HTMLElement {
  const section = harness.container.querySelector<HTMLElement>('[data-slot="canvas-model-inputs"]');
  const trigger = section?.querySelector<HTMLButtonElement>('button[aria-expanded]');
  if (section == null || trigger?.getAttribute('aria-expanded') !== 'true')
    throw new Error('Expected expanded Model inputs in the Explorer.');
  return section;
}

export async function mountModel(
  additionalModels: boolean | number = 0,
  overrides: Pick<CanvasShellPropsOverrides, 'layout' | 'workspaceCommands'> = {}
): Promise<{
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
    ...Array.from({ length: Number(additionalModels) }, (_, index) => ({
      ...fixture.transform,
      id: index === 0 ? 'other-model' : `other-model-${index}`,
      name: index === 0 ? 'Other model' : `Other model ${index + 1}`,
    })),
  ];
  await harness.render({
    ...overrides,
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
