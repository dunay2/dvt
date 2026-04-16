export const canvasViewCopy = {
  routeLoadingTitle: 'Loading canvas',
  routeLoadingMessage: 'Loading workspace graph data for the main authoring surface.',
  backendLoadingTitle: 'Checking backend readiness',
  backendLoadingMessage:
    'Canvas is waiting for the backend readiness checks to settle before loading the authoring surface.',
  routeEmptyTitle: 'No graph content loaded',
  routeEmptyEditableMessage:
    'This workspace does not expose graph nodes yet. Use Add data to import sources or load graph content before planning.',
  routeEmptyReadOnlyMessage:
    'This workspace does not expose graph nodes yet. Graph edits are disabled in this context.',
  routeErrorTitle: 'Canvas unavailable',
  routeErrorFallbackMessage: 'The workspace graph could not be loaded for Canvas.',
  routeErrorMessage:
    'Canvas could not load the current workspace graph. Retry after the workspace service is available again.',
  backendBlockedTitle: 'Backend not ready',
  backendBlockedFallbackMessage:
    'Canvas stays blocked until backend readiness is restored in API mode.',
  mutationUnavailableMessage: 'Graph edits are unavailable in this context.',
  readOnlyTitle: 'Read-only canvas',
  readOnlyMessage:
    'Inspect the graph and overlays here, but planning, run start, and graph edits are disabled in this context.',
  limitedAccessTitle: 'Limited mutation access',
  readOnlyNote: 'Graph inspection and overlays remain available while mutation is gated.',
} as const;
