/**
 * Owned concern: resolve Preview selection from the single authority named by
 * the request, then return server-verified planner input.
 */
import type {
  DbtProjectFilesProvenance,
  DbtProjectGraphProjection,
  ExecutionSelection,
  GenericGraphNodeV1,
  GenericGraphSourceV1,
  PlanAdmissionEvidence,
  PlanAdmissionFindingSubject,
  PlanPreviewProvenance,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';

import { buildPreviewSelectionRejection } from './previewSelectionFinding.js';
import type { ProjectDbtGraphFromFilesUseCase } from './projectDbtGraphFromFilesUseCase.js';
import type {
  ExecutableSubgraphSelectionRejection,
  ResolveAuthorizedExecutableSubgraphService,
} from './resolveAuthorizedExecutableSubgraph.js';

type PreviewSelectionRejection = {
  readonly ok: false;
  readonly rejection: ExecutableSubgraphSelectionRejection;
};

type PreviewSelectionResolution =
  | {
      readonly ok: true;
      readonly value: {
        readonly graphSource: GenericGraphSourceV1;
        readonly nodeIds: readonly string[];
        readonly decisionScopeNodeIds: readonly string[];
        readonly requestedRootNodeIds: readonly string[];
      };
    }
  | PreviewSelectionRejection;

type PreviewSelectionInput = {
  readonly selection: ExecutionSelection;
  readonly graphSource: GenericGraphSourceV1;
  readonly provenance?: PlanPreviewProvenance;
};

const EXECUTABLE_RESOURCE = {
  model: { stepKind: 'DBT_MODEL', kind: 'dbt:model', role: 'transform' },
  snapshot: { stepKind: 'DBT_SNAPSHOT', kind: 'dbt:snapshot', role: 'transform' },
  test: { stepKind: 'DBT_TEST', kind: 'dbt:test', role: 'check' },
} as const;

export class ResolveAuthorizedPreviewSelectionService {
  public constructor(
    private readonly deps: {
      readonly graphDraftResolver: Pick<ResolveAuthorizedExecutableSubgraphService, 'execute'>;
      readonly projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
    }
  ) {}

  public async execute(
    input: PreviewSelectionInput,
    context: AuthorizedCommandExecutionContext
  ): Promise<PreviewSelectionResolution> {
    if (input.provenance?.kind !== 'dbt-project-files') {
      const graphDraftResult = await this.deps.graphDraftResolver.execute(input, context);
      return graphDraftResult.ok
        ? {
            ok: true,
            value: {
              graphSource: input.graphSource,
              nodeIds: graphDraftResult.value.nodeIds,
              decisionScopeNodeIds: graphDraftResult.value.decisionScopeNodeIds,
              requestedRootNodeIds: [...input.selection.nodeIds],
            },
          }
        : graphDraftResult;
    }

    return this.resolveDbtProjectFiles(input, input.provenance, context);
  }

  private async resolveDbtProjectFiles(
    input: PreviewSelectionInput,
    provenance: DbtProjectFilesProvenance,
    context: AuthorizedCommandExecutionContext
  ): Promise<PreviewSelectionResolution> {
    const projectId = context.scope.projectId?.value;
    const environmentId = context.scope.environmentId?.value;
    if (projectId === undefined || environmentId === undefined) {
      return reject(
        context.requestId,
        'authorized_scope_incomplete',
        'Authorized scope is missing projectId or environmentId.',
        input.selection.nodeIds
      );
    }
    if (input.selection.mode !== 'explicit') {
      return reject(
        context.requestId,
        'dbt_project_selection_mode_unsupported',
        'File-authoritative dbt Preview requires an explicit resolved selection.',
        input.selection.nodeIds,
        [
          {
            evidenceCode: 'selection_mode',
            observedValue: input.selection.mode,
            expectedValue: 'explicit',
          },
        ]
      );
    }
    if (!sameStringSet(input.selection.nodeIds, provenance.selectedUniqueIds)) {
      return reject(
        context.requestId,
        'dbt_project_selection_provenance_mismatch',
        'Execution selection must match the resource set bound into dbt Preview provenance.',
        [...input.selection.nodeIds, ...provenance.selectedUniqueIds],
        [
          {
            evidenceCode: 'selection_matches_preview_provenance',
            observedValue: false,
            expectedValue: true,
          },
        ]
      );
    }

    let projection: DbtProjectGraphProjection;
    try {
      projection = await this.deps.projectGraph.execute({
        canvasId: provenance.canvasId,
        scope: {
          tenantId: context.scope.tenantId.value,
          projectId,
          environmentId,
        },
      });
    } catch {
      return reject(
        context.requestId,
        'dbt_project_preview_projection_unavailable',
        'The authoritative dbt project projection could not be resolved.',
        input.selection.nodeIds,
        [
          {
            evidenceCode: 'authoritative_project_projection_available',
            observedValue: false,
            expectedValue: true,
            reference: { kind: 'project-revision', id: provenance.projectRoot },
          },
        ]
      );
    }

    const provenanceMismatch = findProvenanceMismatch(projection, provenance);
    if (provenanceMismatch !== null) {
      return reject(
        context.requestId,
        'dbt_project_preview_provenance_stale',
        provenanceMismatch.reason,
        input.selection.nodeIds,
        provenanceMismatch.evidence
      );
    }

    const canonicalGraph = buildAuthoritativeGraph(
      projection,
      provenance.selectedUniqueIds,
      context.requestId
    );
    if (!canonicalGraph.ok) {
      return canonicalGraph;
    }
    if (!sameGraphSource(input.graphSource, canonicalGraph.value)) {
      return reject(
        context.requestId,
        'dbt_project_graph_source_mismatch',
        'Browser graph semantics do not match the current authoritative dbt project projection.',
        input.selection.nodeIds,
        [
          {
            evidenceCode: 'browser_graph_matches_authoritative_projection',
            observedValue: false,
            expectedValue: true,
          },
        ]
      );
    }

    return {
      ok: true,
      value: {
        graphSource: canonicalGraph.value,
        nodeIds: [...provenance.selectedUniqueIds],
        requestedRootNodeIds: [...input.selection.nodeIds],
        decisionScopeNodeIds: projection.nodes
          .filter((node) => node.resourceType in EXECUTABLE_RESOURCE)
          .map((node) => node.uniqueId)
          .sort(compareStrings),
      },
    };
  }
}

type ProvenanceMismatch = Readonly<{
  reason: string;
  evidence: readonly PlanAdmissionEvidence[];
}>;

function findProvenanceMismatch(
  projection: DbtProjectGraphProjection,
  provenance: DbtProjectFilesProvenance
): ProvenanceMismatch | null {
  const authority = projection.authorityBinding.authority;
  if (
    projection.authorityBinding.canvasId !== provenance.canvasId ||
    authority.kind !== 'dbt-project-files' ||
    authority.projectRoot !== provenance.projectRoot ||
    projection.projectRevision.projectRoot !== provenance.projectRoot
  ) {
    return {
      reason: 'The active Canvas authority no longer matches the previewed dbt project.',
      evidence: [
        {
          evidenceCode: 'canvas_authority_matches_preview_provenance',
          observedValue: false,
          expectedValue: true,
        },
      ],
    };
  }
  if (
    projection.freshness !== 'fresh' ||
    !projection.capabilities.canPreview ||
    projection.projectRevision.contentSetSha256 !== provenance.contentSetSha256 ||
    projection.analysisSha256 !== provenance.analysisSha256 ||
    projection.projectRevision.dbtVersion !== provenance.dbtVersion
  ) {
    return {
      reason: 'The analyzed dbt project revision no longer matches the preview provenance.',
      evidence: [
        {
          evidenceCode: 'project_content_set_sha256',
          observedValue: projection.projectRevision.contentSetSha256,
          expectedValue: provenance.contentSetSha256,
          reference: { kind: 'project-revision', id: provenance.projectRoot },
        },
        {
          evidenceCode: 'project_analysis_sha256',
          observedValue: projection.analysisSha256,
          expectedValue: provenance.analysisSha256,
          reference: { kind: 'project-revision', id: provenance.projectRoot },
        },
        {
          evidenceCode: 'project_preview_capability',
          observedValue: projection.capabilities.canPreview,
          expectedValue: true,
        },
        {
          evidenceCode: 'project_projection_freshness',
          observedValue: projection.freshness,
          expectedValue: 'fresh',
        },
      ],
    };
  }
  if (!sameExecutionTarget(projection.executionTarget, provenance.executionTarget)) {
    return {
      reason: 'The server-owned dbt execution target no longer matches the preview provenance.',
      evidence: [
        {
          evidenceCode: 'execution_target_match',
          observedValue: false,
          expectedValue: true,
        },
        {
          evidenceCode: 'execution_target_provider',
          observedValue: projection.executionTarget?.provider ?? 'unavailable',
          expectedValue: provenance.executionTarget.provider,
        },
        {
          evidenceCode: 'execution_target_adapter',
          observedValue: projection.executionTarget?.adapter ?? 'unavailable',
          expectedValue: provenance.executionTarget.adapter,
        },
        {
          evidenceCode: 'execution_target_name',
          observedValue: projection.executionTarget?.targetName ?? 'unavailable',
          expectedValue: provenance.executionTarget.targetName,
        },
      ],
    };
  }
  return null;
}

function buildAuthoritativeGraph(
  projection: DbtProjectGraphProjection,
  selectedUniqueIds: readonly string[],
  requestId: string
): { readonly ok: true; readonly value: GenericGraphSourceV1 } | PreviewSelectionRejection {
  const nodeById = new Map(projection.nodes.map((node) => [node.uniqueId, node]));
  const selectedIdSet = new Set(selectedUniqueIds);

  for (const nodeId of selectedUniqueIds) {
    const node = nodeById.get(nodeId);
    if (node === undefined || !(node.resourceType in EXECUTABLE_RESOURCE)) {
      return reject(
        requestId,
        'dbt_project_selected_resource_not_executable',
        `Selected dbt resource ${nodeId} is missing or is not executable.`,
        [nodeId],
        [
          {
            evidenceCode: 'selected_resource_executable',
            observedValue: false,
            expectedValue: true,
            subject: { kind: 'resource', id: nodeId },
          },
        ],
        'resource'
      );
    }
  }

  const graphNodes: GenericGraphNodeV1[] = [];
  for (const nodeId of selectedUniqueIds) {
    const node = nodeById.get(nodeId)!;
    const presentation = EXECUTABLE_RESOURCE[node.resourceType as keyof typeof EXECUTABLE_RESOURCE];
    const incomingExecutableIds = projection.edges
      .filter((edge) => edge.targetUniqueId === nodeId)
      .map((edge) => nodeById.get(edge.sourceUniqueId))
      .filter(
        (dependency): dependency is NonNullable<typeof dependency> =>
          dependency !== undefined && dependency.resourceType in EXECUTABLE_RESOURCE
      )
      .map((dependency) => dependency.uniqueId);
    const missingDependency = incomingExecutableIds.find(
      (dependencyId) => !selectedIdSet.has(dependencyId)
    );
    if (missingDependency !== undefined) {
      return reject(
        requestId,
        'dbt_project_dependency_gap',
        `Selected dbt resource ${nodeId} is missing executable dependency ${missingDependency}.`,
        [nodeId, missingDependency],
        [
          {
            evidenceCode: 'executable_dependency_selected',
            observedValue: false,
            expectedValue: true,
            subject: { kind: 'resource', id: missingDependency },
          },
        ],
        'resource'
      );
    }

    graphNodes.push({
      nodeId,
      stepKind: presentation.stepKind,
      dependsOn: [...new Set(incomingExecutableIds)].sort(compareStrings),
      metadata: {
        displayName: node.name,
        tags: { kind: presentation.kind, pluginId: 'dbt', role: presentation.role },
      },
    });
  }

  return {
    ok: true,
    value: {
      kind: 'generic-graph-v1',
      sourceFamily: 'dbt',
      sourceVersion: '1.0',
      nodes: graphNodes.sort((left, right) => compareStrings(left.nodeId, right.nodeId)),
    },
  };
}

function sameExecutionTarget(
  actual: DbtProjectGraphProjection['executionTarget'],
  expected: DbtProjectFilesProvenance['executionTarget']
): boolean {
  return (
    actual?.provider === expected.provider &&
    actual.adapter === expected.adapter &&
    actual.targetName === expected.targetName &&
    actual.credentialRef === expected.credentialRef
  );
}

function sameGraphSource(actual: GenericGraphSourceV1, expected: GenericGraphSourceV1): boolean {
  return (
    JSON.stringify(normalizeGraphSource(actual)) === JSON.stringify(normalizeGraphSource(expected))
  );
}

function normalizeGraphSource(graphSource: GenericGraphSourceV1): unknown {
  return {
    kind: graphSource.kind,
    sourceFamily: graphSource.sourceFamily,
    sourceVersion: graphSource.sourceVersion,
    nodes: graphSource.nodes
      .map((node) => ({
        nodeId: node.nodeId,
        stepKind: node.stepKind,
        dependsOn: [...node.dependsOn].sort(compareStrings),
        ...(node.stepTypeConfig === undefined ? {} : { stepTypeConfig: node.stepTypeConfig }),
        ...(node.metadata === undefined
          ? {}
          : {
              metadata: {
                ...(node.metadata.displayName === undefined
                  ? {}
                  : { displayName: node.metadata.displayName }),
                ...(node.metadata.sourceRef === undefined
                  ? {}
                  : { sourceRef: node.metadata.sourceRef }),
                ...(node.metadata.tags === undefined
                  ? {}
                  : {
                      tags: Object.fromEntries(
                        Object.entries(node.metadata.tags).sort(([left], [right]) =>
                          compareStrings(left, right)
                        )
                      ),
                    }),
              },
            }),
      }))
      .sort((left, right) => compareStrings(left.nodeId, right.nodeId)),
  };
}

function sameStringSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort(compareStrings);
  const sortedRight = [...right].sort(compareStrings);
  return sortedLeft.every((value, index) => value === sortedRight[index]);
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

function reject(
  requestId: string,
  cause: string,
  reason: string,
  subjectIds: readonly string[],
  evidence: readonly PlanAdmissionEvidence[] = [],
  subjectKind: PlanAdmissionFindingSubject['kind'] = 'selection'
): PreviewSelectionRejection {
  const subjects: readonly PlanAdmissionFindingSubject[] = subjectIds.map((id) => ({
    kind: subjectKind,
    id,
  }));
  return {
    ok: false,
    rejection: buildPreviewSelectionRejection({
      requestId,
      cause,
      reason,
      subjects,
      evidence,
    }),
  };
}
