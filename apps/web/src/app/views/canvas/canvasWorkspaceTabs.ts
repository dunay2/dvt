/** Shared tab admission limit and DOM identities for the Canvas workspace. */
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
