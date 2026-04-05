export const RUNTIME_ROUTE_PATH = {
  start: '/runs/start',
  plansPreview: '/plans/preview',
  plansImport: '/plans/import',
  list: '/runs',
  get: '/runs/:runId',
  events: '/runs/:runId/events',
  signal: '/runs/:runId/signal',
  cancel: '/runs/:runId/cancel',
} as const;

export const PROTECTED_RUNTIME_ROUTE_SUMMARY = [
  `POST ${RUNTIME_ROUTE_PATH.start}`,
  `POST ${RUNTIME_ROUTE_PATH.plansPreview}`,
  `POST ${RUNTIME_ROUTE_PATH.plansImport}`,
  `GET ${RUNTIME_ROUTE_PATH.list}`,
  `GET ${RUNTIME_ROUTE_PATH.get}`,
  `GET ${RUNTIME_ROUTE_PATH.events}`,
  `POST ${RUNTIME_ROUTE_PATH.signal}`,
  `POST ${RUNTIME_ROUTE_PATH.cancel}`,
].join(', ');
