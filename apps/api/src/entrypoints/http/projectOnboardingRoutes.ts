/**
 * Owned concern: adapt authenticated project onboarding rails to HTTP.
 */
import type { FastifyInstance } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { CreateProjectUseCase } from '../../application/services/createProjectUseCase.js';
import type { ListProjectsUseCase } from '../../application/services/listProjectsUseCase.js';

import { authenticateHttpBearerRequest } from './httpBearerAuthentication.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type ProjectOnboardingRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly listProjectsUseCase: Pick<ListProjectsUseCase, 'execute'>;
  readonly createProjectUseCase: Pick<CreateProjectUseCase, 'execute'>;
  readonly rateLimit: { readonly max: number; readonly timeWindow: number };
};

type CreateProjectBody = {
  readonly tenantId?: unknown;
  readonly name?: unknown;
};

export function registerProjectOnboardingRoutes(
  app: FastifyInstance,
  deps: ProjectOnboardingRouteDeps
): void {
  app.get(
    RUNTIME_ROUTE_PATH.projects,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const principal = await authenticateHttpBearerRequest(request, reply, deps.authenticator);
      if (principal === null) return;

      reply.code(200).send(await deps.listProjectsUseCase.execute(principal));
    }
  );

  app.post<{ Body: CreateProjectBody }>(
    RUNTIME_ROUTE_PATH.projects,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const principal = await authenticateHttpBearerRequest(request, reply, deps.authenticator);
      if (principal === null) return;

      const parsed = parseCreateProjectRequest(request.body, request.headers['idempotency-key']);
      if (!parsed.ok) {
        reply.code(400).send({
          error: {
            type: 'bad_request',
            reason: parsed.reason,
          },
        });
        return;
      }

      const outcome = await deps.createProjectUseCase.execute(principal, parsed.command);
      switch (outcome.kind) {
        case 'created':
          reply.code(201).send({
            project: outcome.project,
            effectiveWorkspace: outcome.effectiveWorkspace,
          });
          return;
        case 'replayed':
          reply.code(200).send({
            project: outcome.project,
            effectiveWorkspace: outcome.effectiveWorkspace,
          });
          return;
        case 'tenant_not_granted':
        case 'action_not_granted':
          reply.code(403).send({
            error: {
              type: 'forbidden',
              reason: outcome.kind,
            },
          });
          return;
        case 'duplicate_project_name':
        case 'idempotency_conflict':
          reply.code(409).send({
            error: {
              type: 'conflict',
              reason: outcome.kind,
            },
          });
          return;
      }
    }
  );
}

function parseCreateProjectRequest(
  body: CreateProjectBody | undefined,
  idempotencyHeader: string | string[] | undefined
):
  | {
      readonly ok: true;
      readonly command: {
        readonly tenantId: string;
        readonly name: string;
        readonly idempotencyKey: string;
      };
    }
  | { readonly ok: false; readonly reason: string } {
  const idempotencyKey = Array.isArray(idempotencyHeader)
    ? idempotencyHeader[0]
    : idempotencyHeader;
  if (typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
    return { ok: false, reason: 'missing_idempotency_key' };
  }

  if (typeof body?.tenantId !== 'string' || body.tenantId.trim().length === 0) {
    return { ok: false, reason: 'invalid_tenant_id' };
  }

  if (typeof body?.name !== 'string' || body.name.trim().length === 0) {
    return { ok: false, reason: 'invalid_project_name' };
  }

  return {
    ok: true,
    command: {
      tenantId: body.tenantId.trim(),
      name: body.name.trim(),
      idempotencyKey: idempotencyKey.trim(),
    },
  };
}
