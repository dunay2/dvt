/**
 * Owned concern: publish the canonical get-run-events action and pagination
 * bounds used by the HTTP parser.
 */
import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';

export const GET_RUN_EVENTS_LIMIT = {
  MAX: 500,
} as const;

export const GET_RUN_EVENTS_ACTION = AUTHORIZATION_ACTION.runLogsView;
