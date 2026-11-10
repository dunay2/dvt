/**
 * Owned concern: prepare one protected producer projection shared by SQL
 * inspection and bounded row Preview; row probing belongs to its consumer.
 * Why: selection and producer admission must agree before any external work,
 * rather than independently choosing dependencies for each response surface.
 * Corner cases: validate the original native digest before file access, narrow
 * relation analysis without replacing response authority, and preserve typed
 * file denials and complete protected topology checks.
 */
import {
  DvtTransformAuthoringAuthorityV1Schema,
  parseExecutionSelection,
  resolveWorkspaceNodeInstances,
  type TransformDataSampleRequest,
} from '@dvt/contracts';

import type { AuthorizedExecutionContext } from '../ports/authContract.js';
import { CanvasTransformProjectionUnavailableError } from '../ports/canvasTransformSql.js';
import {
  DbtModelProducerAccessDeniedError,
  type IDbtModelProducerResolver,
} from '../ports/dbtModelProducer.js';

import {
  projectDvtPostgresTransform,
  type DvtPostgresTransformProjection,
} from './dvtPostgresTransformProjection.js';
import type { ResolveAuthorizedExecutableSubgraphService } from './resolveAuthorizedExecutableSubgraph.js';
import {
  resolveDvtTerminalTransformClosure,
  type DvtTerminalTransformClosure,
} from './resolveDvtTerminalTransformClosure.js';
import { selectCanvasTransformProducerDependencies } from './selectCanvasTransformProducerDependencies.js';

type ProjectionInput = Pick<
  TransformDataSampleRequest,
  'canvasId' | 'transformNodeId' | 'semanticPlanSha256' | 'relationId'
>;

export type AuthorizedCanvasTransformProjection = Readonly<{
  draftRevision: string;
  scope: Readonly<{ tenantId: string; projectId: string; environmentId: string }>;
  closure: DvtTerminalTransformClosure;
  projection: DvtPostgresTransformProjection;
}>;

export class ResolveCanvasTransformProjection {
  public constructor(
    private readonly deps: Readonly<{
      graphDraftResolver: Pick<
        ResolveAuthorizedExecutableSubgraphService,
        'executeWithAuthorizedDraft'
      >;
      modelProducers?: IDbtModelProducerResolver;
    }>
  ) {}

  public async execute(
    input: ProjectionInput,
    context: AuthorizedExecutionContext
  ): Promise<AuthorizedCanvasTransformProjection> {
    const resolved = await this.deps.graphDraftResolver.executeWithAuthorizedDraft(
      {
        selection: parseExecutionSelection({ mode: 'upstream', nodeIds: [input.transformNodeId] }),
      },
      context
    );
    if (!resolved.ok) throw new CanvasTransformProjectionUnavailableError('selection_unavailable');
    const { authorizedDraft } = resolved.value;
    const activeCanvasId = authorizedDraft.draft.activeCanvasId ?? authorizedDraft.draft.canvas.id;
    if (activeCanvasId !== input.canvasId)
      throw new CanvasTransformProjectionUnavailableError('canvas_changed');
    const projectId = context.scope.projectId?.value;
    const environmentId = context.scope.environmentId?.value;
    if (projectId === undefined || environmentId === undefined)
      throw new CanvasTransformProjectionUnavailableError('selection_unavailable');
    const nodes = resolveWorkspaceNodeInstances(authorizedDraft.draft.nodes).filter((node) =>
      resolved.value.nodeIds.includes(node.id)
    );
    const selected = nodes.find((node) => node.id === input.transformNodeId);
    const authority = DvtTransformAuthoringAuthorityV1Schema.safeParse(
      selected?.metadata?.['transformAuthoring']
    );
    // Reject an obsolete native Model before the producer resolver can request compilation.
    if (
      input.semanticPlanSha256 !== undefined &&
      authority.success &&
      input.semanticPlanSha256 !== authority.data.semanticDocument.semanticPlan.sha256
    )
      throw new CanvasTransformProjectionUnavailableError('canvas_changed');
    try {
      if (input.relationId !== undefined && input.semanticPlanSha256 === undefined)
        throw new CanvasTransformProjectionUnavailableError('selection_unavailable');
      if (
        input.relationId !== undefined &&
        authority.success &&
        !authority.data.semanticDocument.sidecar.relations.some(
          (relation) => relation.relationId === input.relationId
        )
      )
        throw new CanvasTransformProjectionUnavailableError('relation_outside_output_plan');
      const selection = {
        draft: authorizedDraft.draft,
        selectedNodeIds: resolved.value.nodeIds,
        selectedEdgeIds: resolved.value.edgeIds,
        previewTargetId: input.transformNodeId,
      };
      const dependencies = selectCanvasTransformProducerDependencies(selection, input.relationId);
      const producerNodes = nodes.filter((node) => dependencies.externalNodeIds.has(node.id));
      const externalProducers =
        producerNodes.length === 0
          ? undefined
          : await this.deps.modelProducers?.resolve(producerNodes, context);
      const closure = resolveDvtTerminalTransformClosure(
        selection,
        externalProducers,
        input.relationId
      );
      if (closure.transform.id !== input.transformNodeId)
        throw new CanvasTransformProjectionUnavailableError('selection_unavailable');
      if (
        input.semanticPlanSha256 !== undefined &&
        input.semanticPlanSha256 !== closure.semanticDocument.semanticPlan.sha256
      )
        throw new CanvasTransformProjectionUnavailableError('canvas_changed');
      if (
        input.relationId !== undefined &&
        !closure.semanticDocument.sidecar.relations.some(
          (relation) => relation.relationId === input.relationId
        )
      )
        throw new CanvasTransformProjectionUnavailableError('relation_outside_output_plan');
      const projection = await projectDvtPostgresTransform(closure, input.relationId);
      return {
        draftRevision: authorizedDraft.revision,
        scope: { tenantId: context.scope.tenantId.value, projectId, environmentId },
        closure,
        projection,
      };
    } catch (error) {
      if (error instanceof CanvasTransformProjectionUnavailableError) throw error;
      if (error instanceof DbtModelProducerAccessDeniedError)
        throw new CanvasTransformProjectionUnavailableError('file_access_denied');
      throw new CanvasTransformProjectionUnavailableError('projection_unsupported');
    }
  }
}
