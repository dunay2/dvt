/** Shared tab admission limit and DOM identities for the Canvas workspace. */
import type {
  CanvasModelView,
  CanvasModelWorkspaceTabContribution,
} from './canvasWorkspaceMenuContributionStore';
export const MAX_CANVAS_MODEL_TABS = 6;

export const canvasWorkspaceTabs = {
  canvas: { tabId: 'canvas-workspace-tab', panelId: 'canvas-workspace-surface' },
  model: { tabId: 'canvas-model-main-tab', panelId: 'canvas-model-workspace-surface' },
  code: { tabId: 'canvas-code-main-tab', panelId: 'canvas-code-workspace-surface' },
} as const;

export function canvasModelWorkspaceTabIds(nodeId: string) {
  const suffix = encodeURIComponent(nodeId);
  return {
    tabId: `${canvasWorkspaceTabs.model.tabId}-${suffix}`,
    panelId: `${canvasWorkspaceTabs.model.panelId}-${suffix}`,
  };
}

export type OpenModel = Readonly<{ id: string; view: CanvasModelView }>;

export function planModelTabSelection(
  opened: readonly OpenModel[],
  nodeId: string,
  view: CanvasModelView | undefined,
  current: CanvasModelWorkspaceTabContribution | null
): readonly OpenModel[] | null {
  const existing = opened.find(({ id }) => id === nodeId);
  if (existing == null && opened.length >= MAX_CANVAS_MODEL_TABS) return null;
  const next = { id: nodeId, view: view ?? existing?.view ?? 'semantic' } as const;
  const tabs = opened.map((tab) => updateModelTabView(tab, next, current));
  return existing == null ? [...tabs, next] : tabs;
}

function updateModelTabView(
  tab: OpenModel,
  next: OpenModel,
  current: CanvasModelWorkspaceTabContribution | null
): OpenModel {
  if (tab.id === next.id) return next;
  if (tab.id === current?.nodeId && current.views != null) {
    return { ...tab, view: current.views.active };
  }
  return tab;
}
