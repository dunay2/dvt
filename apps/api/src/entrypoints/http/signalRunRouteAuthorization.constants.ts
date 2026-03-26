import type { SupportedSignalType } from '../../application/ports/runtime.js';

export type SignalCommandActionName = 'run:cancel' | 'run:signal';

export const SIGNAL_COMMAND_ACTION = {
  CANCEL: 'run:cancel',
  SIGNAL: 'run:signal',
} as const;

export const SIGNAL_ACTION_BY_TYPE: Readonly<Record<SupportedSignalType, SignalCommandActionName>> =
  {
    PAUSE: SIGNAL_COMMAND_ACTION.SIGNAL,
    RESUME: SIGNAL_COMMAND_ACTION.SIGNAL,
    CANCEL: SIGNAL_COMMAND_ACTION.CANCEL,
  };
