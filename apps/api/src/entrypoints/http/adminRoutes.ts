/**
 * @file apps/api/src/entrypoints/http/adminRoutes.ts
 * @baseline ADR-0004: Event Sourcing Strategy — snapshot is derived from event replay
 * @baseline ADR-0031: Adapter Tenant Isolation Strategy — tenantId required for all operations
 *
 * Admin routes for operational repair tasks.
 * These routes are disabled by default (DVT_ADMIN_ROUTES_ENABLED=false).
 * Never expose these routes behind a public load-balancer without additional
 * network-level access controls.
 */
import type { IRunStateStore } from '@dvt/contracts';
import type { FastifyInstance } from 'fastify';


export function registerAdminRoutes(app: FastifyInstance, stateStore: IRunStateStore): void {
  /**
   * POST /admin/runs/:runId/rebuild-snapshot
   *
   * Replays all persisted events for the run and overwrites the materialized
   * snapshot. Use when a snapshot is known to be stale, missing, or corrupt.
   *
   * Body: { tenantId: string }
   * Response 200: { runId, status, lastSeq (implied) }
   * Response 400: { error: "BAD_REQUEST", code: "MISSING_TENANT_ID" }
   * Response 404: { error: "RUN_NOT_FOUND" }
   * Response 500: { error: "INTERNAL_ERROR" }
   */
  app.post<{ Params: { runId: string }; Body: { tenantId?: string } }>(
    '/admin/runs/:runId/rebuild-snapshot',
    async (request, reply) => {
      const { runId } = request.params;
      const tenantId = request.body?.tenantId;

      if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
        reply.code(400).send({ error: 'BAD_REQUEST', code: 'MISSING_TENANT_ID' });
        return;
      }

      try {
        const snapshot = await stateStore.rebuildSnapshot(tenantId.trim(), runId);
        reply.code(200).send({ runId, status: snapshot.status });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.startsWith('RUN_NOT_FOUND')) {
          reply.code(404).send({ error: 'RUN_NOT_FOUND', runId });
          return;
        }
        request.log.error({ err, runId, tenantId }, 'rebuild-snapshot failed');
        reply.code(500).send({ error: 'INTERNAL_ERROR' });
      }
    }
  );
}
