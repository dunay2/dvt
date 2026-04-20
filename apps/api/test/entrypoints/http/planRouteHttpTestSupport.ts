import { vi } from 'vitest';

import { buildCompileBody, buildImportBody, buildPreviewBody } from './planRouteFixtures.js';

type RouteRequestArgs = {
  readonly id?: string;
  readonly authorization?: string | null;
  readonly body?: Record<string, unknown>;
  readonly logError?: (...args: readonly unknown[]) => unknown;
};

type RouteRequest = {
  id: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  log: {
    error: (...args: readonly unknown[]) => unknown;
  };
};

function buildHeaders(authorization: string | null | undefined): Record<string, string> {
  if (authorization === null) {
    return {};
  }

  return {
    authorization: authorization ?? 'Bearer token',
  };
}

export function createReply(): {
  statusCode: number;
  payload: unknown;
  headers: Record<string, string>;
  code(status: number): unknown;
  header(name: string, value: string): unknown;
  send(payload: unknown): unknown;
} {
  return {
    statusCode: 200,
    payload: undefined,
    headers: {},
    code(status: number) {
      this.statusCode = status;
      return this;
    },
    header(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    send(payload: unknown) {
      this.payload = payload;
      return this;
    },
  };
}

export type TestAuthDeps = {
  authenticator: { authenticateBearerToken: ReturnType<typeof vi.fn> };
  authorizer: { authorize: ReturnType<typeof vi.fn> };
};

export function okAuthDeps(): TestAuthDeps {
  return {
    authenticator: {
      authenticateBearerToken: vi.fn(async () => ({
        ok: true,
        principal: {
          principalId: 'principal-1',
        },
      })),
    },
    authorizer: {
      authorize: vi.fn(async () => ({
        ok: true,
        context: {
          principal: {
            principalId: 'principal-1',
          },
          scope: {
            tenantId: { value: 'tenant-1' },
            projectId: { value: 'project-1' },
            environmentId: { value: 'env-1' },
          },
          action: { kind: 'command', name: 'run:start' },
          requestId: 'req-test-auth',
          authorizedAt: new Date('2026-04-05T00:00:00.000Z'),
        },
      })),
    },
  };
}

export function createPreviewRequest(args: RouteRequestArgs = {}): RouteRequest {
  return {
    id: args.id ?? 'req-preview',
    headers: buildHeaders(args.authorization),
    body: args.body ?? buildPreviewBody(),
    log: { error: args.logError ?? vi.fn() },
  };
}

export function createCompileRequest(args: RouteRequestArgs = {}): RouteRequest {
  return {
    id: args.id ?? 'req-compile',
    headers: buildHeaders(args.authorization),
    body: args.body ?? buildCompileBody(),
    log: { error: args.logError ?? vi.fn() },
  };
}

export function createImportRequest(args: RouteRequestArgs = {}): RouteRequest {
  return {
    id: args.id ?? 'req-import',
    headers: buildHeaders(args.authorization),
    body: args.body ?? buildImportBody(),
    log: { error: args.logError ?? vi.fn() },
  };
}
