import { parsePlannerInputEnvelopeV2 } from '@dvt/contracts';

import type { StartRunCommand, StartRunPlanRef } from '../../application/ports/auth.js';
import {
  type AuthorizationAction,
  EnvironmentId,
  ProjectId,
  TenantId,
  type RequestedScope,
} from '../../domain/auth/types.js';

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

type PlannerCommandFields = {
  -readonly [K in
    | 'graphSource'
    | 'manifestRef'
    | 'manifest'
    | 'nodes'
    | 'policies'
    | 'environment'
    | 'observability']?: StartRunCommand[K];
};

function badRequest(code: string): ParseStartRunBadRequestResult {
  return { ok: false, status: 400, body: { error: 'BAD_REQUEST', code } };
}

export function parseStartRunBody(body: unknown): ParseStartRunRequestResult {
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

function parseSelection(
  selection: unknown
): { readonly ok: true; readonly value: ReadonlyArray<string> } | { readonly ok: false } {
  if (Array.isArray(selection)) {
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
  if (!isPlainRecord(body)) {
    return { ok: false, code: 'INVALID_BODY' };
  }

  return { ok: true, value: body };
}

function parseStartRunScope(
  record: Record<string, unknown>
): ParseStartRunFieldResult<ParsedStartRunScope> {
  const tenantId = TenantId.parse(asStringOrUndefined(record.tenantId));
  const projectId = ProjectId.parse(asStringOrUndefined(record.projectId));
  const environmentId = EnvironmentId.parse(asStringOrUndefined(record.environmentId));

  const parsedScope = buildParsedStartRunScope(tenantId, projectId, environmentId);
  if (parsedScope.ok) {
    return parsedScope;
  }

  return { ok: false, code: parsedScope.code };
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
  const sourceCheck = validatePlannerSourceSelection(hasPlanRef, plannerSourceCount);
  if (!sourceCheck.ok) return { ok: false, code: sourceCheck.code };

  if (hasPlanRef) {
    return buildPlanRefCommand(record.planRef, runId, targetAdapter.value, selection.value);
  }

  return buildPlannerBackedCommand(record, runId, targetAdapter.value, selection.value);
}

function countPlannerSources(record: Record<string, unknown>): number {
  return ['graphSource', 'manifestRef', 'manifest', 'nodes'].filter(
    (key) => record[key] !== undefined
  ).length;
}

function validatePlannerSourceSelection(
  hasPlanRef: boolean,
  plannerSourceCount: number
): { readonly ok: true } | { readonly ok: false; readonly code: string } {
  if (hasPlanRef && plannerSourceCount > 0) {
    return { ok: false, code: 'CONFLICTING_PLAN_INPUTS' };
  }
  if (!hasPlanRef && plannerSourceCount !== 1) {
    return { ok: false, code: 'INVALID_PLAN_SOURCE' };
  }

  return { ok: true };
}

function buildPlanRefCommand(
  rawPlanRef: unknown,
  runId: string,
  targetAdapter: 'temporal' | 'mock',
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

function buildPlannerBackedCommand(
  record: Record<string, unknown>,
  runId: string,
  targetAdapter: 'temporal' | 'mock',
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
  const result: PlannerCommandFields = {};

  const graphSource = mapGraphSource(parsed.graphSource);
  if (graphSource !== undefined) result.graphSource = graphSource;

  const manifestRef = mapManifestRef(parsed.manifestRef);
  if (manifestRef !== undefined) result.manifestRef = manifestRef;

  if (parsed.manifest !== undefined) result.manifest = parsed.manifest;

  const nodes = mapNodes(parsed.nodes);
  if (nodes !== undefined) result.nodes = nodes;

  if (parsed.policies !== undefined) result.policies = parsed.policies;

  const environment = mapEnvironment(parsed.environment);
  if (environment !== undefined) result.environment = environment;

  const observability = mapObservability(parsed.observability);
  if (observability !== undefined) result.observability = observability;

  return result;
}

function mapGraphSource(
  graphSource: ReturnType<typeof parsePlannerInputEnvelopeV2>['graphSource']
): StartRunCommand['graphSource'] | undefined {
  if (graphSource === undefined) return undefined;

  return {
    kind: graphSource.kind,
    nodes: graphSource.nodes.map((node) => ({
      nodeId: node.nodeId,
      resourceType: node.resourceType,
      dependsOn: [...node.dependsOn],
    })),
  };
}

function mapManifestRef(
  manifestRef: ReturnType<typeof parsePlannerInputEnvelopeV2>['manifestRef']
): StartRunCommand['manifestRef'] | undefined {
  if (manifestRef === undefined) return undefined;

  return {
    uri: manifestRef.uri,
    sha256: manifestRef.sha256,
    ...(manifestRef.artifactId === undefined ? {} : { artifactId: manifestRef.artifactId }),
  };
}

function mapNodes(
  nodes: ReturnType<typeof parsePlannerInputEnvelopeV2>['nodes']
): StartRunCommand['nodes'] | undefined {
  if (nodes === undefined) return undefined;

  return nodes.map((node) => ({
    nodeId: node.nodeId,
    resourceType: node.resourceType,
    dependsOn: [...node.dependsOn],
  }));
}

function mapEnvironment(
  environment: ReturnType<typeof parsePlannerInputEnvelopeV2>['environment']
): StartRunCommand['environment'] | undefined {
  if (environment === undefined) return undefined;

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

function mapObservability(
  observability: ReturnType<typeof parsePlannerInputEnvelopeV2>['observability']
): StartRunCommand['observability'] | undefined {
  if (observability === undefined) return undefined;

  return {
    ...(observability.tags === undefined ? {} : { tags: observability.tags }),
    ...(observability.extra === undefined ? {} : { extra: observability.extra }),
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function buildParsedStartRunScope(
  tenantId: ReturnType<typeof TenantId.parse>,
  projectId: ReturnType<typeof ProjectId.parse>,
  environmentId: ReturnType<typeof EnvironmentId.parse>
): ParseStartRunFieldResult<ParsedStartRunScope> {
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
