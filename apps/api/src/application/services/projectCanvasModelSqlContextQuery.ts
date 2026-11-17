/** Read one revision-bound SQL namespace without requiring executable target semantics. */
import {
  ModelSqlContextResponseSchema,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WorkspaceGraphAuthoringDraftSchema,
  readWorkspaceDbtModelReference,
  resolveWorkspaceNodeInstances,
  type ModelSqlDiagnostic,
  type ModelSqlTarget,
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
import type { ResolveCanvasModelSqlInputs } from './resolveCanvasModelSqlInputs.js';

export class ProjectCanvasModelSqlContextQuery implements ICanvasModelSqlContextQuery {
  public constructor(
    private readonly deps: Readonly<{
      store: Pick<IWorkspaceGraphDraftStore, 'read'>;
      authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolveGraphDraftReadAuthority'>;
      inputs: Pick<ResolveCanvasModelSqlInputs, 'execute'>;
    }>
  ) {}

  public async execute(input: ModelSqlTarget, context: AuthorizedExecutionContext) {
    return (await this.prepare(input, context)).response;
  }

  public async prepare(
    input: ModelSqlTarget,
    context: AuthorizedExecutionContext
  ): Promise<PreparedCanvasModelSqlContext> {
    const targetIdentity = { canvasId: input.canvasId, transformNodeId: input.transformNodeId };
    const projectId = context.scope.projectId?.value;
    const environmentId = context.scope.environmentId?.value;
    if (projectId == null || environmentId == null)
      throw new CanvasModelSqlUnavailableError('model_unavailable');
    const scope = { tenantId: context.scope.tenantId.value, projectId, environmentId };
    const stored = await this.deps.store.read(scope);
    if (
      stored == null ||
      stored.schemaVersion !== WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION ||
      jcsCanonicalize(stored.scope) !== jcsCanonicalize(scope)
    )
      throw new CanvasModelSqlUnavailableError('model_unavailable');
    const parsed = WorkspaceGraphAuthoringDraftSchema.safeParse(stored.draftPayload);
    if (!parsed.success || (parsed.data.activeCanvasId ?? parsed.data.canvas.id) !== input.canvasId)
      throw new CanvasModelSqlUnavailableError('model_unavailable');
    const authority = await this.deps.authorityPolicy.resolveGraphDraftReadAuthority({
      ...scope,
      canvasId: input.canvasId,
    });
    const target = resolveWorkspaceNodeInstances(parsed.data.nodes).find(
      (node) => node.id === input.transformNodeId
    );
    if (
      authority.kind !== 'resolved' ||
      authority.binding.authority.kind !== 'graph-draft' ||
      target?.pluginId !== 'dvt' ||
      target.role !== 'transform' ||
      !['transform', 'dvt:transform'].includes(target.kind) ||
      readWorkspaceDbtModelReference(target) != null
    )
      throw new CanvasModelSqlUnavailableError('model_unavailable');
    const prepared = await this.deps.inputs.execute(
      parsed.data,
      target.id,
      stored.revision,
      context
    );
    let sql: string | null = null;
    const diagnostics: ModelSqlDiagnostic[] = [];
    if (prepared.source.currentDocument != null) {
      try {
        sql = await projectModelSqlSource(prepared.source.currentDocument, prepared.source.inputs);
      } catch (error) {
        if (!(
          error instanceof DvtSubstraitPostgresProjectionError ||
          error instanceof SubstraitAnalysisError
        ))
          throw error;
        diagnostics.push({
          code: 'unsupported_sql',
          source: 'semantic',
          message: 'The saved Model cannot be expressed by the admitted SQL source profile.',
        });
      }
    }
    const current = await this.deps.store.read(scope);
    if (current?.revision !== stored.revision)
      throw new CanvasModelSqlUnavailableError('stale_context');
    const identity = {
      ...targetIdentity,
      draftRevision: stored.revision,
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
    const response = ModelSqlContextResponseSchema.parse({
      schemaVersion: 'canvas-model-sql-context.v1',
      ...targetIdentity,
      draftRevision: stored.revision,
      contextSha256: sha256HexUtf8(jcsCanonicalize(identity)),
      semanticPlanSha256: identity.semanticPlanSha256,
      connectionRef: identity.connectionRef,
      inputs: identity.inputs,
      sql,
      diagnostics,
    });
    return {
      response,
      source: prepared.source,
      graph: prepared.graph,
      externalProjections: prepared.externalProjections,
      sourceRefs: prepared.sourceRefs,
      modelRefs: prepared.modelRefs,
    };
  }
}
