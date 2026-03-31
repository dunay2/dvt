export const GET_RUN_EVENTS_LIMIT = {
  MAX: 500,
} as const;

export const GET_RUN_EVENTS_ACTION = {
  kind: 'query',
  name: 'run:logs:view',
} as const;
