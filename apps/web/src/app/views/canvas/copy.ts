export const canvasViewCopy = {
  routeLoadingTitle: 'Loading canvas',
  routeLoadingMessage: 'Loading workspace graph data for the main authoring surface.',
  routeEmptyTitle: 'No graph content loaded',
  routeEmptyMessage:
    'This workspace does not expose graph nodes yet. Use Add data to import sources or load graph content before planning.',
  routeErrorTitle: 'Canvas unavailable',
  routeErrorFallbackMessage: 'The workspace graph could not be loaded for Canvas.',
  routeErrorMessage:
    'Canvas could not load the current workspace graph. Retry after the workspace service is available again.',
  readOnlyTitle: 'Read-only canvas',
  readOnlyMessage:
    'Inspect the graph and overlays here, but planning, run start, and edge edits are disabled in this context.',
  limitedAccessTitle: 'Limited mutation access',
  readOnlyNote: 'Graph inspection and overlays remain available while mutation is gated.',
} as const;
