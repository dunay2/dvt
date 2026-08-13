import { createNoopObservability, type IObservability } from '@dvt/observability';

import type { IStartRunTargetAdapterRegistry } from '../../../src/application/ports/IStartRunTargetAdapterRegistry.js';
import { startRunRoute } from '../../../src/entrypoints/http/startRunRoute.js';

export const VALID_PLAN_REF = {
  uri: 'https://plans.example.com/plan-1.json',
  sha256: 'a'.repeat(64),
  schemaVersion: '1.0.0',
  planId: 'plan-1',
  planVersion: '2.0',
} as const;

export const VALID_GRAPH_SOURCE = {
  kind: 'generic-graph-v1',
  sourceFamily: 'dbt',
  sourceVersion: 'manifest-v10',
  nodes: [{ nodeId: 'model_a', stepKind: 'DBT_MODEL', dependsOn: [] }],
} as const;

export const VALID_BODY = {
  tenantId: 't1',
  projectId: 'p1',
  environmentId: 'e1',
  selection: {
    mode: 'explicit',
    nodeIds: ['model_a'],
  },
  planRef: VALID_PLAN_REF,
  targetAdapter: 'temporal' as const,
} as const;

export const VALID_GENERATED_RUN_ID = 'run_0196454a-f0c8-7d37-a8e8-8a7f9afac0f1' as const;

export const VALID_GENERATED_RUN_ID_ALT = 'run_0196454a-f0c8-7f7f-a8e8-8a7f9afac0f2' as const;

export function okResult<T>(value: T): { readonly ok: true; readonly value: T } {
  return { ok: true, value };
}

export function errorResult<T>(error: T): { readonly ok: false; readonly error: T } {
  return { ok: false, error };
}

export function httpError(
  type: string,
  reason: string,
  extra?: { target?: string; details?: Record<string, unknown> }
): { error: { type: string; reason: string; target?: string; details?: Record<string, unknown> } } {
  return {
    error: {
      type,
      reason,
      ...(extra?.target === undefined ? {} : { target: extra.target }),
      ...(extra?.details === undefined ? {} : { details: extra.details }),
    },
  };
}

export type ReplyDouble = {
  statusCode: number;
  payload: unknown;
  headers: Record<string, string>;
  code(status: number): unknown;
  header(name: string, value: string): unknown;
  send(payload: unknown): unknown;
};

export function createReply(): ReplyDouble {
  return {
    statusCode: 200,
    payload: undefined as unknown,
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

export function registryWith(...supported: Array<'temporal'>): IStartRunTargetAdapterRegistry {
  return {
    isSupported(value: string): value is 'temporal' {
      return supported.includes(value as 'temporal');
    },
    listSupported() {
      return [...supported];
    },
  };
}

type UseCaseDouble = {
  execute(command: Record<string, unknown>, context: unknown): Promise<unknown>;
};

type RouteRequestOverride = {
  readonly id?: string;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
};

type InvokeRouteArgs = {
  readonly request?: RouteRequestOverride;
  readonly useCase?: UseCaseDouble;
  readonly authenticator?: { authenticateBearerToken(token: string | undefined): Promise<unknown> };
  readonly authorizer?: { authorize(...args: readonly unknown[]): Promise<unknown> };
  readonly telemetry?: { recordStartRunLatency(duration: number, outcome: string): void };
  readonly registry?: IStartRunTargetAdapterRegistry;
  readonly runIdGenerator?: () => string;
  readonly observability?: IObservability;
};

export async function invokeStartRunRoute(args: InvokeRouteArgs = {}): Promise<{
  readonly reply: ReplyDouble;
}> {
  const reply = createReply();
  const useCase =
    args.useCase ??
    ({
      async execute() {
        return okResult({
          kind: 'accepted' as const,
          runId: VALID_GENERATED_RUN_ID,
          accepted: true,
        });
      },
    } satisfies UseCaseDouble);

  const hasBodyOverride = args.request !== undefined && Object.hasOwn(args.request, 'body');

  const routeDependencies = {
    adapterRegistry: args.registry ?? registryWith('temporal'),
    authenticator:
      args.authenticator ??
      ({
        async authenticateBearerToken() {
          return {
            ok: true as const,
            principal: {
              principalId: 'user-1',
              subjectId: 'user-1',
              issuer: 'issuer',
              audience: 'audience',
              principalType: 'user' as const,
              expiresAt: new Date('2030-01-01T00:00:00Z'),
              rawScopes: [],
              assertedTenantIds: ['t1'],
              assertedProjectIds: ['p1'],
            },
          };
        },
      } as never),
    authorizer:
      args.authorizer ??
      ({
        async authorize(_principal: unknown, requestedScope: unknown, requestId: string) {
          return {
            ok: true as const,
            context: {
              ...(requestedScope as object),
              principal: {},
              scope: requestedScope,
              action: (requestedScope as { action: unknown }).action,
              requestId,
              authorizedAt: new Date('2026-08-13T00:00:00Z'),
            },
          };
        },
      } as never),
    observability: args.observability ?? createNoopObservability(),
    telemetry: args.telemetry ?? { recordStartRunLatency() {} },
    useCase: useCase as never,
    runIdGenerator: args.runIdGenerator ?? (() => VALID_GENERATED_RUN_ID),
  };

  await startRunRoute(
    {
      id: args.request?.id ?? 'req-1',
      headers: args.request?.headers ?? {},
      body: hasBodyOverride ? args.request?.body : VALID_BODY,
      log: { error() {} },
    } as never,
    reply as never,
    routeDependencies as never
  );

  return { reply };
}
