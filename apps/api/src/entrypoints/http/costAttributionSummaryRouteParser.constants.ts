/**
 * Owned concern: publish the canonical cost attribution summary action and
 * pagination bounds used by the HTTP parser.
 */
import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';

export const COST_ATTRIBUTION_SUMMARY_LIMIT = {
  DEFAULT: 50,
  MAX: 500,
} as const;

export const COST_ATTRIBUTION_SUMMARY_ACTION = AUTHORIZATION_ACTION.runList;
