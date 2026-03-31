/**
 * @file apps/api/src/entrypoints/http/adminRoutes.ts
 * @baseline ADR-0004: Event Sourcing Strategy â€” snapshot is derived from event replay
 * @baseline ADR-0031: Adapter Tenant Isolation Strategy â€” tenantId required for all operations
 *
 * Admin routes for operational repair tasks.
 * These routes are disabled by default (DVT_ADMIN_ROUTES_ENABLED=false).
 * Never expose these routes behind a public load-balancer without additional
 * network-level access controls.
 */
import type { IRunStateStoreMaintenance } from '@dvt/engine';
import type { FastifyInstance } from 'fastify';

import { createHttpErrorResponse, HTTP_ERROR_TYPE, sendHttpResponse } from './httpErrorContract.js';
import { mapRouteParseIssue, mapRuntimeDomainError } from './httpErrorMapper.js';
import { badRequestIssue } from './routeParseIssue.js';

export function registerAdminRoutes(
  app: FastifyInstance,
  stateStore: IRunStateStoreMaintenance
): void {
  /**
   * POST /admin/runs/:runId/rebuild-snapshot
   *
   * Replays all persisted events for the run and overwrites the materialized
   * snapshot. Use when a snapshot is known to be stale, missing, or corrupt.
   *
   * Body: { tenantId: string }
   * Response 200: { runId, status, lastSeq (implied) }
   * Response 400: { error: { type: "bad_request", reason: "missing_tenant_id" } }
   * Response 404: { error: { type: "not_found", reason: "run_not_found" } }
   * Response 500: { error: { type: "internal_server_error", reason: "internal_error" } }
   */
  app.post<{ Params: { runId: string }; Body: { tenantId?: string } }>(
    '/admin/runs/:runId/rebuild-snapshot',
    async (request, reply) => {
      const { runId } = request.params;
      const tenantId = request.body?.tenantId;

      if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
        sendHttpResponse(reply, mapRouteParseIssue(badRequestIssue('missing_tenant_id', {
          target: 'tenantId',
        })));
        return;
      }

      try {
        const snapshot = await stateStore.rebuildSnapshot(tenantId.trim(), runId);
        reply.code(200).send({ runId, status: snapshot.status });
      } catch (err) {
        const mapped = mapRuntimeDomainError(err);
        if (mapped !== null) {
          sendHttpResponse(reply, mapped);
          return;
        }

        request.log.error({ err, runId, tenantId }, 'rebuild-snapshot failed');
        sendHttpResponse(
          reply,
          createHttpErrorResponse({
            type: HTTP_ERROR_TYPE.internalServerError,
            reason: 'internal_error',
          })
        );
      }
    }
  );
}
