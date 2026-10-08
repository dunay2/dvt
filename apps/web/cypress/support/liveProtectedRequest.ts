/**
 * Owned concern: share protected LIVE request credentials and draft URL construction.
 * @baseline GH-3578: fixture seeding and generic LIVE transport have separate consumers.
 * @decision Read Cypress environment only when a request helper is called.
 * @consequence Module import is side-effect free and seeds reuse identical authentication.
 * @version 1.0.0
 */
import type { E2eWorkspaceSession } from './workspaceSession';

export function readRequiredEnv(name: string): string {
  const value = Cypress.env(name);
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Cypress env ${name} is required for the live protected-runtime lane`);
  }

  return value.trim();
}

export function buildDraftReadUrl(session: E2eWorkspaceSession): string {
  const apiBaseUrl = readRequiredEnv('apiBaseUrl');
  const query = new URLSearchParams(session);
  return `${apiBaseUrl}/workspace/graph/draft?${query.toString()}`;
}

export function buildAuthorizationHeaders(): Record<string, string> {
  const apiBearerToken = readRequiredEnv('apiBearerToken');

  return {
    Authorization: `Bearer ${apiBearerToken}`,
    Accept: 'application/json',
  };
}

export function buildBearerAuth(): { bearer: string } {
  return {
    bearer: readRequiredEnv('apiBearerToken'),
  };
}
