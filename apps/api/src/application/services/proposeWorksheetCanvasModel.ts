/** Prepare a complete graph-native SQL Model without a preliminary or parallel write. */
import {
  ModelSqlContextResponseSchema,
  TransformSqlDraftDataSampleRequestSchema,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WorksheetCanvasModelProposalSchema,
  WorksheetCanvasModelRequestSchema,
  WorkspaceGraphAuthoringDraftSchema,
  type WorksheetCanvasModelRequest,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import { AUTHORIZATION_ACTION, type AuthorizationAction } from '../ports/accessDecision.js';
import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import {
  CanvasModelSqlAccessDeniedError,
  CanvasModelSqlUnavailableError,
  type PreparedCanvasModelSqlContext,
} from '../ports/canvasModelSql.js';
import type { IWorksheetCanvasModelQuery } from '../ports/worksheetCanvasModel.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';

import type { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';
import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';
import { resolveWorksheetExecutionConnection } from './canvasLiteralModelConnection.js';
import { CompileCanvasModelSqlQuery } from './compileCanvasModelSqlQuery.js';
import { PrepareCanvasSqlDraftProjection } from './prepareCanvasSqlDraftProjection.js';
import type { ResolveCanvasModelSqlInputs } from './resolveCanvasModelSqlInputs.js';
import {
  appendWorksheetSource,
  appendWorksheetVirtualTarget,
  completeWorksheetDraft,
} from './worksheetCanvasModelDraft.js';
import {
  resolveWorksheetCatalogRelation,
  verifyWorksheetConnection,
  worksheetScope,
  type WorksheetInputDependencies,
} from './worksheetCanvasModelInputs.js';
import { verifyWorksheetModels } from './worksheetCanvasModelProducers.js';
import { inspectWorksheetModelSql } from './worksheetCanvasModelSql.js';
import { bindWorksheetModelSql } from './worksheetCanvasModelSqlBindings.js';

type Dependencies = WorksheetInputDependencies &
  Readonly<{
    store: Pick<IWorkspaceGraphDraftStore, 'read'>;
    authorizer: Pick<AuthorizeCommandScopeService, 'authorize'>;
    authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolveGraphDraftReadAuthority'>;
    inputs: Pick<ResolveCanvasModelSqlInputs, 'execute'>;
  }>;

async function authorizeProposal(
  deps: Dependencies,
  context: AuthorizedExecutionContext,
  input: WorksheetCanvasModelRequest
) {
  const scope = worksheetScope(context);
  const actions: AuthorizationAction[] = [
    AUTHORIZATION_ACTION.workspaceGraphDraftSave,
    AUTHORIZATION_ACTION.workspaceSourceImportView,
  ];
  if (input.models.some((model) => model.kind === 'dbt-model'))
    actions.push(AUTHORIZATION_ACTION.workspaceFilesView);
  for (const action of actions) {
    const permission = await deps.authorizer.authorize(
      context.principal,
      { ...context.scope, action },
      context.requestId
    );
    if (
      !permission.ok ||
      jcsCanonicalize(worksheetScope(permission.context)) !== jcsCanonicalize(scope)
    )
      throw new CanvasModelSqlAccessDeniedError();
  }
  return scope;
}

async function readProposalRecord(
  deps: Dependencies,
  input: WorksheetCanvasModelRequest,
  context: AuthorizedExecutionContext
) {
  const scope = worksheetScope(context),
    stored = await deps.store.read(scope);
  if (!stored) throw new CanvasModelSqlUnavailableError('model_unavailable');
  const identity = { schema: stored.schemaVersion, scope: stored.scope };
  if (
    jcsCanonicalize(identity) !==
    jcsCanonicalize({ schema: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION, scope })
  )
    throw new CanvasModelSqlUnavailableError('model_unavailable');
  if (stored.revision !== input.expectedRevision)
    throw new CanvasModelSqlUnavailableError('stale_context');
  return stored;
}

async function readProposalDraft(
  deps: Dependencies,
  input: WorksheetCanvasModelRequest,
  context: AuthorizedExecutionContext
) {
  const scope = worksheetScope(context),
    stored = await readProposalRecord(deps, input, context);
  const draft = WorkspaceGraphAuthoringDraftSchema.parse(stored.draftPayload);
  if ((draft.activeCanvasId ?? draft.canvas.id) !== input.canvasId)
    throw new CanvasModelSqlUnavailableError('model_unavailable');
  const authority = await deps.authorityPolicy.resolveGraphDraftReadAuthority({
    ...scope,
    canvasId: input.canvasId,
  });
  if (authority.kind !== 'resolved' || authority.binding.authority.kind !== 'graph-draft')
    throw new CanvasModelSqlUnavailableError('model_unavailable');
  return draft;
}

function preparedContext(
  input: WorksheetCanvasModelRequest,
  resolved: Awaited<ReturnType<ResolveCanvasModelSqlInputs['execute']>>
): PreparedCanvasModelSqlContext {
  const identity = {
    canvasId: input.canvasId,
    transformNodeId: input.modelId,
    draftRevision: input.expectedRevision,
  };
  const response = ModelSqlContextResponseSchema.parse({
    ...identity,
    schemaVersion: 'canvas-model-sql-context.v1',
    contextSha256: sha256HexUtf8(
      jcsCanonicalize({
        ...identity,
        connectionRef: resolved.connectionRef,
        inputs: resolved.inputs,
        provenance: resolved.provenance,
        dependencies: resolved.dependencyDigests,
      })
    ),
    connectionRef: resolved.connectionRef,
    semanticPlanSha256: null,
    sql: null,
    inputs: resolved.inputs.map((publication) => ({
      nodeId: publication.input.nodeId,
      name: publication.name,
      sqlName: publication.input.sqlName,
      columns: publication.columns,
    })),
    diagnostics: [],
  });
  return {
    response,
    source: resolved.source,
    graph: resolved.graph,
    externalProjections: resolved.externalProjections,
    sourceRefs: resolved.sourceRefs,
    modelRefs: resolved.modelRefs,
  };
}

function assertResolvedProvenance(
  models: Awaited<ReturnType<typeof verifyWorksheetModels>>['models'],
  resolved: Awaited<ReturnType<ResolveCanvasModelSqlInputs['execute']>>
) {
  for (const model of models) {
    if (model.fileRevision == null) continue;
    const provenance = resolved.modelRefs.get(model.nodeId);
    if (provenance == null) throw new CanvasModelSqlUnavailableError('stale_context');
    const actual = {
      contentSetSha256: provenance.contentSetSha256,
      analysisSha256: provenance.analysisSha256,
    };
    if (jcsCanonicalize(actual) !== jcsCanonicalize(model.fileRevision))
      throw new CanvasModelSqlUnavailableError('stale_context');
  }
}

async function prepareVirtualProposal(
  deps: Dependencies,
  input: WorksheetCanvasModelRequest,
  context: AuthorizedExecutionContext,
  original: WorkspaceGraphAuthoringDraft
) {
  const connection = await verifyWorksheetConnection(deps, input, context);
  const verified = await verifyWorksheetModels(deps, input, original, context);
  const models = verified.models,
    parsed = await inspectWorksheetModelSql(input.sql, models);
  let draft = verified.draft;
  const physical = new Map<string, string>();
  for (const relation of parsed.relations) {
    const source = await resolveWorksheetCatalogRelation({
      deps,
      input,
      relation,
      database: connection.database,
      context,
    });
    const addition = appendWorksheetSource(draft, source, input);
    draft = addition.draft;
    physical.set(relation.key, addition.nodeId);
  }
  const candidate = appendWorksheetVirtualTarget(draft, input, [
    ...physical.values(),
    ...models.map((model) => model.nodeId),
  ]);
  const resolved = await deps.inputs.execute(
    candidate,
    input.modelId,
    input.expectedRevision,
    context
  );
  assertResolvedProvenance(models, resolved);
  const execution = resolveWorksheetExecutionConnection(
    resolved,
    input,
    physical.size + models.length
  );
  const prepared = preparedContext(input, execution);
  const namespace = new Map(resolved.source.inputs.map((input) => [input.nodeId, input.sqlName]));
  const bindSql = () =>
    bindWorksheetModelSql(
      parsed,
      new Map([...physical].map(([key, nodeId]) => [key, namespace.get(nodeId)!])),
      new Map(models.map((model) => [model.alias, namespace.get(model.nodeId)!]))
    );
  return { candidate, prepared, bindSql };
}

function worksheetProposalIdentity(
  input: WorksheetCanvasModelRequest,
  scope: ReturnType<typeof worksheetScope>,
  contextSha256: string
) {
  return {
    schemaVersion: 'worksheet-canvas-model-proposal.v1' as const,
    scope,
    canvasId: input.canvasId,
    expectedRevision: input.expectedRevision,
    modelId: input.modelId,
    name: input.name,
    connectionRef: input.connectionRef,
    sqlSha256: sha256HexUtf8(input.sql),
    contextSha256,
  };
}

async function assertProposalRevision(
  deps: Dependencies,
  input: WorksheetCanvasModelRequest,
  scope: ReturnType<typeof worksheetScope>
) {
  const current = await deps.store.read(scope);
  if (!current) throw new CanvasModelSqlUnavailableError('stale_context');
  const actual = {
    revision: current.revision,
    schema: current.schemaVersion,
    scope: current.scope,
  };
  if (
    jcsCanonicalize(actual) !==
    jcsCanonicalize({
      revision: input.expectedRevision,
      schema: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      scope,
    })
  )
    throw new CanvasModelSqlUnavailableError('stale_context');
}

async function verifyProposalContext(
  deps: Dependencies,
  input: WorksheetCanvasModelRequest,
  prepared: PreparedCanvasModelSqlContext,
  scope: ReturnType<typeof worksheetScope>
) {
  if (input.verifyContextSha256 !== prepared.response.contextSha256)
    throw new CanvasModelSqlUnavailableError('stale_context');
  await assertProposalRevision(deps, input, scope);
  return WorksheetCanvasModelProposalSchema.parse({
    ...worksheetProposalIdentity(input, scope, prepared.response.contextSha256),
    status: 'current',
  });
}

export class ProposeWorksheetCanvasModel implements IWorksheetCanvasModelQuery {
  public constructor(private readonly deps: Dependencies) {}

  public async execute(request: WorksheetCanvasModelRequest, context: AuthorizedExecutionContext) {
    const input = WorksheetCanvasModelRequestSchema.parse(request);
    const scope = await authorizeProposal(this.deps, context, input);
    const draft = await readProposalDraft(this.deps, input, context);
    const { candidate, prepared, bindSql } = await prepareVirtualProposal(
      this.deps,
      input,
      context,
      draft
    );
    if (input.verifyContextSha256 !== undefined)
      return verifyProposalContext(this.deps, input, prepared, scope);
    const sql = await bindSql();
    const compilation = new CompileCanvasModelSqlQuery({
      execute: async () => prepared.response,
      prepare: async () => prepared,
    });
    const compilationInput = {
      canvasId: input.canvasId,
      transformNodeId: input.modelId,
      draftRevision: input.expectedRevision,
      contextSha256: prepared.response.contextSha256,
      sql,
    };
    const projected = await new PrepareCanvasSqlDraftProjection(compilation).execute(
      TransformSqlDraftDataSampleRequestSchema.parse({
        ...compilationInput,
        schemaVersion: 'canvas-transform-sql-draft-data-sample.v1',
      }),
      context
    );
    await assertProposalRevision(this.deps, input, scope);
    const body = {
      ...worksheetProposalIdentity(input, scope, prepared.response.contextSha256),
      status: 'valid' as const,
      draft: completeWorksheetDraft(candidate, input, projected.response),
      columns: projected.response.columns,
    };
    return WorksheetCanvasModelProposalSchema.parse({
      ...body,
      proposalSha256: sha256HexUtf8(jcsCanonicalize(body)),
    });
  }
}
