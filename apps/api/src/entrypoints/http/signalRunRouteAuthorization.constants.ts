import type { SupportedSignalType } from '../../application/ports/runtime.js';

import { RUN_COMMAND_ACTION, type RunCommandActionName } from './runCommandRoute.constants.js';

export type SignalCommandActionName = RunCommandActionName;

export const SIGNAL_COMMAND_ACTION = RUN_COMMAND_ACTION;

export const SIGNAL_ACTION_BY_TYPE: Readonly<Record<SupportedSignalType, SignalCommandActionName>> =
  {
    PAUSE: SIGNAL_COMMAND_ACTION.SIGNAL,
    RESUME: SIGNAL_COMMAND_ACTION.SIGNAL,
    CANCEL: SIGNAL_COMMAND_ACTION.CANCEL,
  };
