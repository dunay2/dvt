/**
 * Owned concern: publish the canonical command-action names for protected run
 * mutation routes.
 */
import { AUTHORIZATION_ACTION_NAME } from '../../application/ports/accessDecision.js';

export const RUN_COMMAND_ACTION = {
  CANCEL: AUTHORIZATION_ACTION_NAME.runCancel,
  RETRY: AUTHORIZATION_ACTION_NAME.runRetry,
  SIGNAL: AUTHORIZATION_ACTION_NAME.runSignal,
} as const;

export type RunCommandActionName = (typeof RUN_COMMAND_ACTION)[keyof typeof RUN_COMMAND_ACTION];
