export const RUNTIME_ROUTE_PATH = {
  start: '/runs/start',
  plansCompile: '/plans/compile',
  plansPreview: '/plans/preview',
  plansImport: '/plans/import',
  workspaceGraphDraft: '/workspace/graph/draft',
  list: '/runs',
  get: '/runs/:runId',
  events: '/runs/:runId/events',
  signal: '/runs/:runId/signal',
  cancel: '/runs/:runId/cancel',
  recover: '/runs/:runId/recover',
} as const;

export const PROTECTED_RUNTIME_ROUTE_SUMMARY = [
  `POST ${RUNTIME_ROUTE_PATH.start}`,
  `POST ${RUNTIME_ROUTE_PATH.plansCompile}`,
  `POST ${RUNTIME_ROUTE_PATH.plansPreview}`,
  `POST ${RUNTIME_ROUTE_PATH.plansImport}`,
  `GET ${RUNTIME_ROUTE_PATH.workspaceGraphDraft}`,
  `PUT ${RUNTIME_ROUTE_PATH.workspaceGraphDraft}`,
  `GET ${RUNTIME_ROUTE_PATH.list}`,
  `GET ${RUNTIME_ROUTE_PATH.get}`,
  `GET ${RUNTIME_ROUTE_PATH.events}`,
  `POST ${RUNTIME_ROUTE_PATH.signal}`,
  `POST ${RUNTIME_ROUTE_PATH.cancel}`,
  `POST ${RUNTIME_ROUTE_PATH.recover}`,
].join(', ');
