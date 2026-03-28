export const RUNTIME_ROUTE_PATH = {
  start: '/runs/start',
  list: '/runs',
  get: '/runs/:runId',
  events: '/runs/:runId/events',
  signal: '/runs/:runId/signal',
  cancel: '/runs/:runId/cancel',
} as const;

export const PROTECTED_RUNTIME_ROUTE_SUMMARY = [
  `POST ${RUNTIME_ROUTE_PATH.start}`,
  `GET ${RUNTIME_ROUTE_PATH.list}`,
  `GET ${RUNTIME_ROUTE_PATH.get}`,
  `GET ${RUNTIME_ROUTE_PATH.events}`,
  `POST ${RUNTIME_ROUTE_PATH.signal}`,
  `POST ${RUNTIME_ROUTE_PATH.cancel}`,
].join(', ');
