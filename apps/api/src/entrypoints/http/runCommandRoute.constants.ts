export const RUN_COMMAND_ACTION = {
  CANCEL: 'run:cancel',
  SIGNAL: 'run:signal',
} as const;

export type RunCommandActionName = (typeof RUN_COMMAND_ACTION)[keyof typeof RUN_COMMAND_ACTION];
