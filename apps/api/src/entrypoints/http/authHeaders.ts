/**
 * Owned concern: expose the protected-runtime authorization-header parser
 * without duplicating token parsing semantics.
 */

export { extractBearerToken } from './extractBearerToken.js';
