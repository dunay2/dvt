export const LIST_RUNS_LIMIT = {
  DEFAULT: 50,
  MAX: 100,
} as const;

export const LIST_RUNS_ACTION = {
  kind: 'query',
  name: 'run:list',
} as const;
