/**
 * Owned concern: publish the canonical list-runs action and pagination bounds
 * used by the HTTP parser.
 */
import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';

export const LIST_RUNS_LIMIT = {
  DEFAULT: 50,
  MAX: 100,
} as const;

export const LIST_RUNS_ACTION = AUTHORIZATION_ACTION.runList;
