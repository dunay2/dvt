/**
 * Owned concern: publish the canonical get-run authorization action constant
 * for HTTP route parsing.
 */
import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';

export const GET_RUN_ACTION = AUTHORIZATION_ACTION.runView;
