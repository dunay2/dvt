import { parsePlannerInputEnvelopeV2 } from '@dvt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { StartRunCommand, StartRunPlanRef } from '../../application/ports/auth.js';
import { StartRunAuthorizedFacade } from '../../application/services/startRunAuthorizedFacade.js';
import {
  type AuthorizationAction,
  EnvironmentId,
  ProjectId,
  TenantId,
  type RequestedScope,
} from '../../domain/auth/types.js';

import { mapStartRunFacadeResult } from './authErrorMapper.js';

type ParsedStartRunRequest = {
  readonly command: StartRunCommand;
  readonly requestedScope: RequestedScope & {
    readonly action: Extract<AuthorizationAction, { kind: 'command' }>;
  };
};

type ParseStartRunRequestResult =
  | { readonly ok: true; readonly value: ParsedStartRunRequest }
  | { readonly ok: false; readonly status: 400; readonly body: Readonly<Record<string, unknown>> };

type ParseStartRunFieldResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: string };

type ParsedStartRunScope = {
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;
};

type ParseStartRunBadRequestResult = Extract<ParseStartRunRequestResult, { readonly ok: false }>;

function badRequest(code: string): ParseStartRunBadRequestResult {
  return { ok: false, status: 400, body: { error: 'BAD_REQUEST', code } };
}

function parseSelection(
  selection: unknown
): { readonly ok: true; readonly value: ReadonlyArray<string> } | { readonly ok: false } {
  if (Array.isArray(selection) && selection.length > 0) {
    if (selection.every((item) => typeof item === 'string')) {
      const normalized = (selection as ReadonlyArray<string>)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      if (normalized.length === selection.length) {
        return { ok: true, value: normalized };
      }
    }
  }

  return { ok: false };
}

function parsePlanRef(
  raw: unknown
):
  | { readonly ok: true; readonly value: StartRunPlanRef }
  | { readonly ok: false; readonly code: string } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, code: 'INVALID_PLAN_REF' };
  }
  const r = raw as Record<string, unknown>;
  const uri = asNonEmptyTrimmedStringOrUndefined(r.uri);
  const sha256 = asNonEmptyTrimmedStringOrUndefined(r.sha256);
  const schemaVersion = asNonEmptyTrimmedStringOrUndefined(r.schemaVersion);
  const planId = asNonEmptyTrimmedStringOrUndefined(r.planId);
  const planVersion = asNonEmptyTrimmedStringOrUndefined(r.planVersion);
  if (uri && sha256 && schemaVersion && planId && planVersion) {
    return { ok: true, value: { uri, sha256, schemaVersion, planId, planVersion } };
  }
  return { ok: false, code: 'INVALID_PLAN_REF' };
}

function parseTargetAdapter(
  raw: unknown
): { readonly ok: true; readonly value: 'temporal' | 'mock' } | { readonly ok: false } {
  const normalized = asNonEmptyTrimmedStringOrUndefined(raw);
  if (normalized === 'temporal' || normalized === 'mock') {
    return { ok: true, value: normalized };
  }
  return { ok: false };
}

function parseBodyRecord(body: unknown): ParseStartRunFieldResult<Record<string, unknown>> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, code: 'INVALID_BODY' };
  }

  return { ok: true, value: body as Record<string, unknown> };
}

function parseStartRunScope(
  record: Record<string, unknown>
): ParseStartRunFieldResult<ParsedStartRunScope> {
  const tenantId = TenantId.parse(asStringOrUndefined(record.tenantId));
  const projectId = ProjectId.parse(asStringOrUndefined(record.projectId));
  const environmentId = EnvironmentId.parse(asStringOrUndefined(record.environmentId));

  if (tenantId.ok && projectId.ok && environmentId.ok) {
    return {
      ok: true,
      value: {
        tenantId: tenantId.value,
        projectId: projectId.value,
        environmentId: environmentId.value,
      },
    };
  }

  if (!tenantId.ok) return { ok: false, code: tenantId.code };
  if (!projectId.ok) return { ok: false, code: projectId.code };
  return { ok: false, code: environmentId.code };
}

function parseStartRunCommand(
  record: Record<string, unknown>
): ParseStartRunFieldResult<StartRunCommand> {
  const selection = parseSelection(record.selection);
  if (!selection.ok) return { ok: false, code: 'INVALID_SELECTION' };

  const runId = asNonEmptyTrimmedStringOrUndefined(record.runId);
  if (runId === undefined) {
    return { ok: false, code: 'INVALID_RUN_ID' };
  }

  const targetAdapter = parseTargetAdapter(record.targetAdapter);
  if (!targetAdapter.ok) return { ok: false, code: 'INVALID_TARGET_ADAPTER' };

  const plannerSourceCount = countPlannerSources(record);
  const hasPlanRef = record.planRef !== undefined;
  if (hasPlanRef) {
    if (plannerSourceCount > 0) return { ok: false, code: 'CONFLICTING_PLAN_INPUTS' };
  } else {
    if (plannerSourceCount !== 1) return { ok: false, code: 'INVALID_PLAN_SOURCE' };
  }

  if (hasPlanRef) {
    const planRef = parsePlanRef(record.planRef);
    if (!planRef.ok) {
      return { ok: false, code: planRef.code };
    }

    return {
      ok: true,
      value: {
        planRef: planRef.value,
        runId,
        targetAdapter: targetAdapter.value,
        selection: selection.value,
      },
    };
  }

  const plannerInput = parsePlannerInput(record, selection.value);
  if (!plannerInput.ok) {
    return { ok: false, code: plannerInput.code };
  }

  return {
    ok: true,
    value: {
      runId,
      targetAdapter: targetAdapter.value,
      selection: selection.value,
      ...(plannerInput.value.graphSource === undefined
        ? {}
        : { graphSource: plannerInput.value.graphSource }),
      ...(plannerInput.value.manifestRef === undefined
        ? {}
        : { manifestRef: plannerInput.value.manifestRef }),
      ...(plannerInput.value.manifest === undefined
        ? {}
        : { manifest: plannerInput.value.manifest }),
      ...(plannerInput.value.nodes === undefined ? {} : { nodes: plannerInput.value.nodes }),
      ...(plannerInput.value.policies === undefined
        ? {}
        : { policies: plannerInput.value.policies }),
      ...(plannerInput.value.environment === undefined
        ? {}
        : { environment: plannerInput.value.environment }),
      ...(plannerInput.value.observability === undefined
        ? {}
        : { observability: plannerInput.value.observability }),
    },
  };
}

function countPlannerSources(record: Record<string, unknown>): number {
  return ['graphSource', 'manifestRef', 'manifest', 'nodes'].filter(
    (key) => record[key] !== undefined
  ).length;
}

function parsePlannerInput(
  record: Record<string, unknown>,
  selection: ReadonlyArray<string>
): ParseStartRunFieldResult<
  Pick<
    StartRunCommand,
    | 'graphSource'
    | 'manifestRef'
    | 'manifest'
    | 'nodes'
    | 'policies'
    | 'environment'
    | 'observability'
  >
> {
  try {
    const parsed = parsePlannerInputEnvelopeV2({
      ...(record.graphSource === undefined ? {} : { graphSource: record.graphSource }),
      ...(record.manifestRef === undefined ? {} : { manifestRef: record.manifestRef }),
      ...(record.manifest === undefined ? {} : { manifest: record.manifest }),
      ...(record.nodes === undefined ? {} : { nodes: record.nodes }),
      ...(record.policies === undefined ? {} : { policies: record.policies }),
      ...(record.environment === undefined ? {} : { environment: record.environment }),
      ...(record.observability === undefined ? {} : { observability: record.observability }),
      selection: { selectedNodeIds: selection },
    });

    return {
      ok: true,
      value: toPlannerCommandFields(parsed),
    };
  } catch {
    return { ok: false, code: 'INVALID_PLAN_SOURCE' };
  }
}

function toPlannerCommandFields(
  parsed: ReturnType<typeof parsePlannerInputEnvelopeV2>
): Pick<
  StartRunCommand,
  | 'graphSource'
  | 'manifestRef'
  | 'manifest'
  | 'nodes'
  | 'policies'
  | 'environment'
  | 'observability'
> {
  return {
    ...(parsed.graphSource !== undefined
      ? {
          graphSource: {
            kind: parsed.graphSource.kind,
            nodes: parsed.graphSource.nodes.map((node) => ({
              nodeId: node.nodeId,
              resourceType: node.resourceType,
              dependsOn: [...node.dependsOn],
            })),
          },
        }
      : {}),
    ...(parsed.manifestRef === undefined
      ? {}
      : {
          manifestRef: {
            uri: parsed.manifestRef.uri,
            sha256: parsed.manifestRef.sha256,
            ...(parsed.manifestRef.artifactId === undefined
              ? {}
              : { artifactId: parsed.manifestRef.artifactId }),
          },
        }),
    ...(parsed.manifest === undefined ? {} : { manifest: parsed.manifest }),
    ...(parsed.nodes === undefined
      ? {}
      : {
          nodes: parsed.nodes.map((node) => ({
            nodeId: node.nodeId,
            resourceType: node.resourceType,
            dependsOn: [...node.dependsOn],
          })),
        }),
    ...(parsed.policies === undefined ? {} : { policies: parsed.policies }),
    ...(parsed.environment === undefined
      ? {}
      : {
          environment: {
            ...(parsed.environment.environmentId === undefined
              ? {}
              : { environmentId: parsed.environment.environmentId }),
            ...(parsed.environment.targetProfile === undefined
              ? {}
              : { targetProfile: parsed.environment.targetProfile }),
            ...(parsed.environment.vars === undefined ? {} : { vars: parsed.environment.vars }),
          },
        }),
    ...(parsed.observability === undefined
      ? {}
      : {
          observability: {
            ...(parsed.observability.tags === undefined ? {} : { tags: parsed.observability.tags }),
            ...(parsed.observability.extra === undefined
              ? {}
              : { extra: parsed.observability.extra }),
          },
        }),
  };
}

function parseStartRunBody(body: unknown): ParseStartRunRequestResult {
  const bodyRecord = parseBodyRecord(body);
  if (!bodyRecord.ok) {
    return badRequest(bodyRecord.code);
  }

  const scope = parseStartRunScope(bodyRecord.value);
  if (!scope.ok) {
    return badRequest(scope.code);
  }

  const command = parseStartRunCommand(bodyRecord.value);
  if (!command.ok) {
    return badRequest(command.code);
  }

  return {
    ok: true,
    value: {
      command: command.value,
      requestedScope: {
        tenantId: scope.value.tenantId,
        projectId: scope.value.projectId,
        environmentId: scope.value.environmentId,
        action: { kind: 'command', name: 'run:start' },
      },
    },
  };
}

function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function asStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNonEmptyTrimmedStringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export async function startRunRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  facade: StartRunAuthorizedFacade
): Promise<void> {
  const parsed = parseStartRunBody(request.body);
  if (!parsed.ok) {
    reply.code(parsed.status).send(parsed.body);
    return;
  }

  const facadeResult = await facade.execute({
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    command: parsed.value.command,
    requestedScope: parsed.value.requestedScope,
  });

  const mapped = mapStartRunFacadeResult(facadeResult);
  if (mapped.headers) {
    for (const [name, value] of Object.entries(mapped.headers)) {
      reply.header(name, value);
    }
  }
  reply.code(mapped.status).send(mapped.body);
}
