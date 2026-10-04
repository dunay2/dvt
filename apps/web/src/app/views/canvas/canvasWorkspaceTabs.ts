/** DOM identity shared by the workspace tab strip and its separately rendered panels. */
export const canvasWorkspaceTabs = {
  canvas: { tabId: 'canvas-workspace-tab', panelId: 'canvas-workspace-surface' },
  model: { tabId: 'canvas-model-main-tab', panelId: 'canvas-model-workspace-surface' },
} as const;
