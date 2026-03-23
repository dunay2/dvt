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

type PlannerCommandFields = Pick<
  StartRunCommand,
  | 'graphSource'
  | 'manifestRef'
  | 'manifest'
  | 'nodes'
  | 'policies'
  | 'environment'
  | 'observability'
>;

type PlannerEnvelope = ReturnType<typeof parsePlannerInputEnvelopeV2>;

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
  if (!environmentId.ok) return { ok: false, code: environmentId.code };

  return {
    ok: true,
    value: {
      tenantId: tenantId.value,
      projectId: projectId.value,
      environmentId: environmentId.value,
    },
  };
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
  const sourceValidation = validatePlannerSourceSelection(hasPlanRef, plannerSourceCount);
  if (!sourceValidation.ok) {
    return { ok: false, code: sourceValidation.code };
  }

  if (hasPlanRef) {
    return buildStartRunCommandFromPlanRef(
      record.planRef,
      runId,
      targetAdapter.value,
      selection.value
    );
  }

  return buildStartRunCommandFromPlannerInput(record, runId, targetAdapter.value, selection.value);
}

function countPlannerSources(record: Record<string, unknown>): number {
  return ['graphSource', 'manifestRef', 'manifest', 'nodes'].filter(
    (key) => record[key] !== undefined
  ).length;
}

function parsePlannerInput(
  record: Record<string, unknown>,
  selection: ReadonlyArray<string>
): ParseStartRunFieldResult<PlannerCommandFields> {
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

function buildStartRunCommandFromPlanRef(
  rawPlanRef: unknown,
  runId: string,
  targetAdapter: StartRunCommand['targetAdapter'],
  selection: ReadonlyArray<string>
): ParseStartRunFieldResult<StartRunCommand> {
  const planRef = parsePlanRef(rawPlanRef);
  if (!planRef.ok) {
    return { ok: false, code: planRef.code };
  }

  return {
    ok: true,
    value: {
      planRef: planRef.value,
      runId,
      targetAdapter,
      selection,
    },
  };
}

function buildStartRunCommandFromPlannerInput(
  record: Record<string, unknown>,
  runId: string,
  targetAdapter: StartRunCommand['targetAdapter'],
  selection: ReadonlyArray<string>
): ParseStartRunFieldResult<StartRunCommand> {
  const plannerInput = parsePlannerInput(record, selection);
  if (!plannerInput.ok) {
    return { ok: false, code: plannerInput.code };
  }

  return {
    ok: true,
    value: {
      runId,
      targetAdapter,
      selection,
      ...plannerInput.value,
    },
  };
}

function validatePlannerSourceSelection(
  hasPlanRef: boolean,
  plannerSourceCount: number
): ParseStartRunFieldResult<null> {
  if (hasPlanRef) {
    if (plannerSourceCount > 0) {
      return { ok: false, code: 'CONFLICTING_PLAN_INPUTS' };
    }
    return { ok: true, value: null };
  }

  if (plannerSourceCount !== 1) {
    return { ok: false, code: 'INVALID_PLAN_SOURCE' };
  }

  return { ok: true, value: null };
}

function toPlannerCommandFields(parsed: PlannerEnvelope): PlannerCommandFields {
  const fields: PlannerCommandFields = {};

  const graphSource = cloneGraphSource(parsed.graphSource);
  if (graphSource !== undefined) {
    fields.graphSource = graphSource;
  }

  const manifestRef = cloneManifestRef(parsed.manifestRef);
  if (manifestRef !== undefined) {
    fields.manifestRef = manifestRef;
  }

  const manifest = parsed.manifest;
  if (manifest !== undefined) {
    fields.manifest = manifest;
  }

  const nodes = cloneNodes(parsed.nodes);
  if (nodes !== undefined) {
    fields.nodes = nodes;
  }

  const policies = parsed.policies;
  if (policies !== undefined) {
    fields.policies = policies;
  }

  const environment = cloneEnvironment(parsed.environment);
  if (environment !== undefined) {
    fields.environment = environment;
  }

  const observability = cloneObservability(parsed.observability);
  if (observability !== undefined) {
    fields.observability = observability;
  }

  return fields;
}

function cloneGraphSource(
  graphSource: PlannerEnvelope['graphSource']
): PlannerCommandFields['graphSource'] | undefined {
  if (graphSource === undefined) {
    return undefined;
  }

  return {
    kind: graphSource.kind,
    nodes: clonePlannerNodes(graphSource.nodes),
  };
}

function cloneManifestRef(
  manifestRef: PlannerEnvelope['manifestRef']
): PlannerCommandFields['manifestRef'] | undefined {
  if (manifestRef === undefined) {
    return undefined;
  }

  return {
    uri: manifestRef.uri,
    sha256: manifestRef.sha256,
    ...(manifestRef.artifactId === undefined ? {} : { artifactId: manifestRef.artifactId }),
  };
}

function cloneNodes(nodes: PlannerEnvelope['nodes']): PlannerCommandFields['nodes'] | undefined {
  if (nodes === undefined) {
    return undefined;
  }

  return clonePlannerNodes(nodes);
}

function clonePlannerNodes(
  nodes: ReadonlyArray<{
    readonly nodeId: string;
    readonly resourceType: string;
    readonly dependsOn: ReadonlyArray<string>;
  }>
): ReadonlyArray<{
  readonly nodeId: string;
  readonly resourceType: string;
  readonly dependsOn: ReadonlyArray<string>;
}> {
  return nodes.map((node) => ({
    nodeId: node.nodeId,
    resourceType: node.resourceType,
    dependsOn: [...node.dependsOn],
  }));
}

function cloneEnvironment(
  environment: PlannerEnvelope['environment']
): PlannerCommandFields['environment'] | undefined {
  if (environment === undefined) {
    return undefined;
  }

  return {
    ...(environment.environmentId === undefined
      ? {}
      : { environmentId: environment.environmentId }),
    ...(environment.targetProfile === undefined
      ? {}
      : { targetProfile: environment.targetProfile }),
    ...(environment.vars === undefined ? {} : { vars: environment.vars }),
  };
}

function cloneObservability(
  observability: PlannerEnvelope['observability']
): PlannerCommandFields['observability'] | undefined {
  if (observability === undefined) {
    return undefined;
  }

  return {
    ...(observability.tags === undefined ? {} : { tags: observability.tags }),
    ...(observability.extra === undefined ? {} : { extra: observability.extra }),
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
