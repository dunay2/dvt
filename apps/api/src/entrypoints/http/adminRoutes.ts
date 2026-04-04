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

import type { IAuthenticator } from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { TenantId } from '../../domain/auth/types.js';

import { authorizeAdminExecutionScope } from './authorizeAdminExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { createHttpErrorResponse, HTTP_ERROR_TYPE, sendHttpResponse } from './httpErrorContract.js';
import { mapRouteParseIssue, mapRuntimeDomainError } from './httpErrorMapper.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestIssue } from './routeParseIssue.js';

const ADMIN_REBUILD_SNAPSHOT_ACTION = {
  kind: 'command',
  name: 'admin:rebuild-snapshot',
} as const;

export function registerAdminRoutes(
  app: FastifyInstance,
  stateStore: IRunStateStoreMaintenance,
  auth: {
    readonly authenticator: IAuthenticator;
    readonly authorizer: AuthorizeCommandScopeService;
  }
): void {
  /**
   * POST /admin/runs/:runId/rebuild-snapshot
   *
   * Replays all persisted events for the run and overwrites the materialized
   * snapshot. Use when a snapshot is known to be stale, missing, or corrupt.
   *
   * Body: { tenantId: string }
   * Response 200: { runId, status, lastSeq (implied) }
   * Response 400: { error: { type: "bad_request", reason: "invalid_body|missing_tenant_id|invalid_tenant_id" } }
   * Response 404: { error: { type: "not_found", reason: "run_not_found" } }
   * Response 500: { error: { type: "internal_server_error", reason: "internal_error" } }
   */
  app.post<{ Params: { runId: string }; Body: unknown }>(
    '/admin/runs/:runId/rebuild-snapshot',
    async (request, reply) => {
      const { runId } = request.params;
      const tenantIdResult = parseTenantIdFromAdminBody(request.body);
      if (!tenantIdResult.ok) {
        sendHttpResponse(reply, mapRouteParseIssue(tenantIdResult.issue));
        return;
      }

      const tenantId = tenantIdResult.value;
      const requestedTenant = TenantId.parse(tenantId);
      if (!requestedTenant.ok) {
        sendHttpResponse(
          reply,
          mapRouteParseIssue(
            badRequestIssue(HTTP_ERROR_REASON.invalidTenantId, {
              target: 'tenantId',
            })
          )
        );
        return;
      }

      const authz = await authorizeAdminExecutionScope({
        authenticator: auth.authenticator,
        authorizer: auth.authorizer,
        token: extractBearerToken(request.headers.authorization),
        requestId: request.id,
        requestedScope: {
          tenantId: requestedTenant.value,
          action: ADMIN_REBUILD_SNAPSHOT_ACTION,
        },
      });
      if (!authz.ok) {
        sendHttpResponse(reply, authz.response);
        return;
      }

      try {
        const snapshot = await stateStore.rebuildSnapshot(tenantId, runId);
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
            reason: HTTP_ERROR_REASON.internalError,
          })
        );
      }
    }
  );
}

function parseTenantIdFromAdminBody(
  body: unknown
):
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly issue: ReturnType<typeof badRequestIssue> } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, issue: badRequestIssue(HTTP_ERROR_REASON.invalidBody) };
  }

  const record = body as Record<string, unknown>;

  if (!Object.hasOwn(record, 'tenantId') || record.tenantId === undefined) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.missingTenantId, { target: 'tenantId' }),
    };
  }

  if (typeof record.tenantId !== 'string') {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidTenantId, { target: 'tenantId' }),
    };
  }

  const tenantId = record.tenantId.trim();
  if (tenantId.length === 0) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidTenantId, { target: 'tenantId' }),
    };
  }

  return { ok: true, value: tenantId };
}
