/**
 * Owned concern: map protected signal types to the canonical run-command
 * authorization action names.
 */
import type { SupportedSignalType } from '../../application/ports/runtime.js';

import { RUN_COMMAND_ACTION, type RunCommandActionName } from './runCommandRoute.constants.js';

export type SignalCommandActionName = RunCommandActionName;

export const SIGNAL_ACTION_BY_TYPE: Readonly<Record<SupportedSignalType, SignalCommandActionName>> =
  {
    PAUSE: RUN_COMMAND_ACTION.SIGNAL,
    RESUME: RUN_COMMAND_ACTION.SIGNAL,
    CANCEL: RUN_COMMAND_ACTION.CANCEL,
  };
