/** Read one revision-bound SQL namespace without requiring executable target semantics. */
import {
  ModelSqlContextResponseSchema,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WorkspaceGraphAuthoringDraftSchema,
  readWorkspaceDbtModelReference,
  resolveWorkspaceNodeInstances,
  type ModelSqlDiagnostic,
  type ModelSqlTarget,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import {
  DvtSubstraitPostgresProjectionError,
  projectModelSqlSource,
} from '@dvt/postgres-projection';
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import {
  CanvasModelSqlUnavailableError,
  type ICanvasModelSqlContextQuery,
  type PreparedCanvasModelSqlContext,
} from '../ports/canvasModelSql.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';

import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';
import {
  authorizeCanvasLiteralModelConnection,
  type CanvasLiteralConnectionAuthority,
} from './canvasLiteralModelConnection.js';
import type { ResolveCanvasModelSqlInputs } from './resolveCanvasModelSqlInputs.js';
import { worksheetScope } from './worksheetCanvasModelInputs.js';

type ResolvedInputs = Awaited<ReturnType<ResolveCanvasModelSqlInputs['execute']>>;
type SqlBuffer = Pick<PreparedCanvasModelSqlContext['response'], 'sql' | 'diagnostics'>;
type Scope = ReturnType<typeof worksheetScope>;
const emptySqlBuffer: SqlBuffer = { sql: null, diagnostics: [] };

function unavailable(): never {
  throw new CanvasModelSqlUnavailableError('model_unavailable');
}

function nativeTarget(draft: WorkspaceGraphAuthoringDraft, id: string): string {
  const node = resolveWorkspaceNodeInstances(draft.nodes).find((candidate) => candidate.id === id);
  if (!node) return unavailable();
  if (node.pluginId !== 'dvt' || node.role !== 'transform') return unavailable();
  if (!['transform', 'dvt:transform'].includes(node.kind) || readWorkspaceDbtModelReference(node))
    return unavailable();
  return node.id;
}

async function savedSqlBuffer(source: ResolvedInputs['source']): Promise<SqlBuffer> {
  if (!source.currentDocument) return emptySqlBuffer;
  try {
    return {
      sql: await projectModelSqlSource(source.currentDocument, source.inputs),
      diagnostics: [],
    };
  } catch (error) {
    if (!(
      error instanceof DvtSubstraitPostgresProjectionError ||
      error instanceof SubstraitAnalysisError
    ))
      throw error;
    const diagnostic: ModelSqlDiagnostic = {
      code: 'unsupported_sql',
      source: 'semantic',
      message: 'The saved Model cannot be expressed by the admitted SQL source profile.',
    };
    return { sql: null, diagnostics: [diagnostic] };
  }
}

function contextResponse(
  targetIdentity: Pick<ModelSqlTarget, 'canvasId' | 'transformNodeId'>,
  record: { revision: string; scope: Scope },
  prepared: ResolvedInputs,
  buffer: SqlBuffer
): PreparedCanvasModelSqlContext['response'] {
  const { revision, scope } = record;
  const identity = {
    ...targetIdentity,
    draftRevision: revision,
    scope,
    inputs: prepared.inputs.map((publication) => ({
      nodeId: publication.input.nodeId,
      name: publication.name,
      sqlName: publication.input.sqlName,
      columns: publication.columns,
    })),
    provenance: prepared.provenance,
    dependencyDigests: prepared.dependencyDigests,
    physicalInputs: prepared.source.inputs.flatMap((source) =>
      'sourceRef' in source.source
        ? [
            {
              nodeId: source.nodeId,
              sourceRef: source.source.sourceRef,
              names: source.source.names,
              columns: source.source.columns ?? source.columns,
            },
          ]
        : []
    ),
    semanticPlanSha256: prepared.source.currentDocument?.sidecar.semanticPlanSha256 ?? null,
    connectionRef: prepared.connectionRef,
    edges: prepared.graph.edges,
  };
  return ModelSqlContextResponseSchema.parse({
    schemaVersion: 'canvas-model-sql-context.v1',
    ...targetIdentity,
    draftRevision: revision,
    contextSha256: sha256HexUtf8(jcsCanonicalize(identity)),
    semanticPlanSha256: identity.semanticPlanSha256,
    connectionRef: identity.connectionRef,
    inputs: identity.inputs,
    ...buffer,
  });
}

export class ProjectCanvasModelSqlContextQuery implements ICanvasModelSqlContextQuery {
  public constructor(
    private readonly deps: CanvasLiteralConnectionAuthority &
      Readonly<{
        store: Pick<IWorkspaceGraphDraftStore, 'read'>;
        authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolveGraphDraftReadAuthority'>;
        inputs: Pick<ResolveCanvasModelSqlInputs, 'execute'>;
      }>
  ) {}

  public async execute(input: ModelSqlTarget, context: AuthorizedExecutionContext) {
    const { target, record, prepared } = await this.readContext(input, context);
    const buffer = await savedSqlBuffer(prepared.source);
    await this.requireCurrentRevision(record);
    return contextResponse(target, record, prepared, buffer);
  }

  public async prepare(
    input: ModelSqlTarget,
    context: AuthorizedExecutionContext
  ): Promise<PreparedCanvasModelSqlContext> {
    const { target, record, prepared } = await this.readContext(input, context);
    await this.requireCurrentRevision(record);
    return {
      response: contextResponse(target, record, prepared, emptySqlBuffer),
      source: prepared.source,
      graph: prepared.graph,
      externalProjections: prepared.externalProjections,
      sourceRefs: prepared.sourceRefs,
      modelRefs: prepared.modelRefs,
    };
  }

  private async readContext(
    input: ModelSqlTarget,
    context: AuthorizedExecutionContext
  ): Promise<{
    target: ModelSqlTarget;
    record: { scope: Scope; revision: string };
    prepared: ResolvedInputs;
  }> {
    const target = { canvasId: input.canvasId, transformNodeId: input.transformNodeId };
    const scope = worksheetScope(context);
    const { draft, revision } = await this.readDraft(scope, input.canvasId);
    const targetId = nativeTarget(draft, input.transformNodeId);
    const prepared = await this.deps.inputs.execute(draft, targetId, revision, context);
    if (prepared.graph.literalConnections?.size && prepared.connectionRef != null)
      await authorizeCanvasLiteralModelConnection(this.deps, prepared.connectionRef, context);
    return { target, record: { scope, revision }, prepared };
  }

  private async requireCurrentRevision({
    scope,
    revision,
  }: {
    scope: Scope;
    revision: string;
  }): Promise<void> {
    const current = await this.deps.store.read(scope);
    if (current?.revision !== revision) throw new CanvasModelSqlUnavailableError('stale_context');
  }

  private async readDraft(scope: Scope, canvasId: string) {
    const stored = await this.deps.store.read(scope);
    if (stored?.schemaVersion !== WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION) return unavailable();
    if (jcsCanonicalize(stored.scope) !== jcsCanonicalize(scope)) return unavailable();
    const parsed = WorkspaceGraphAuthoringDraftSchema.safeParse(stored.draftPayload);
    if (!parsed.success) return unavailable();
    if ((parsed.data.activeCanvasId ?? parsed.data.canvas.id) !== canvasId) return unavailable();
    const authority = await this.deps.authorityPolicy.resolveGraphDraftReadAuthority({
      ...scope,
      canvasId,
    });
    if (authority.kind !== 'resolved' || authority.binding.authority.kind !== 'graph-draft')
      return unavailable();
    return { draft: parsed.data, revision: stored.revision };
  }
}
