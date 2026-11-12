/**
 * Owned concern: admit a file selection only after native compile and a second authority read.
 * @decision Read authority, compile natively, then read authority again before admission.
 * @consequence Asynchronous source or destination changes cannot persist a runnable file plan.
 */
import type {
  DbtProjectFilesProvenance,
  DbtProjectGraphProjection,
  ExecutionSelection,
  GenericGraphSourceV1,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../../ports/authContract.js';
import { compareGraphIds } from '../compareGraphIds.js';
import type { ProjectDbtGraphFromFilesUseCase } from '../projectDbtGraphFromFilesUseCase.js';

import type { DbtPreviewCompilationGate } from './DbtPreviewCompilationGate.js';
import {
  buildAuthoritativeGraph,
  EXECUTABLE_RESOURCE,
  findProvenanceMismatch,
  reject,
  sameGraphSource,
  sameStringSet,
} from './dbtPreviewSelectionPolicy.js';

type DbtPreviewSelectionDependencies = Readonly<{
  projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
  dbtCompilation: Pick<DbtPreviewCompilationGate, 'execute'>;
}>;

type DbtPreviewSelectionInput = Readonly<{
  selection: ExecutionSelection;
  graphSource: GenericGraphSourceV1;
}>;

type DbtPreviewSelectionResolution =
  | Readonly<{
      ok: true;
      value: {
        readonly graphSource: GenericGraphSourceV1;
        readonly nodeIds: readonly string[];
        readonly requestedRootNodeIds: readonly string[];
        readonly decisionScopeNodeIds: readonly string[];
      };
    }>
  | ReturnType<typeof reject>;

export async function resolveDbtProjectPreviewSelection(
  input: DbtPreviewSelectionInput,
  provenance: DbtProjectFilesProvenance,
  context: AuthorizedCommandExecutionContext,
  deps: DbtPreviewSelectionDependencies
): Promise<DbtPreviewSelectionResolution> {
  const projectId = context.scope.projectId?.value;
  const environmentId = context.scope.environmentId?.value;
  if (projectId === undefined || environmentId === undefined) {
    return reject(
      'authorized_scope_incomplete',
      'Authorized scope is missing projectId or environmentId.'
    );
  }
  if (input.selection.mode !== 'explicit') {
    return reject(
      'dbt_project_selection_mode_unsupported',
      'File-authoritative dbt Preview requires an explicit resolved selection.'
    );
  }
  if (!sameStringSet(input.selection.nodeIds, provenance.selectedUniqueIds)) {
    return reject(
      'dbt_project_selection_provenance_mismatch',
      'Execution selection must match the resource set bound into dbt Preview provenance.'
    );
  }

  let projection: DbtProjectGraphProjection;
  try {
    projection = await deps.projectGraph.execute({
      canvasId: provenance.canvasId,
      scope: {
        tenantId: context.scope.tenantId.value,
        projectId,
        environmentId,
      },
    });
  } catch {
    return reject(
      'dbt_project_preview_projection_unavailable',
      'The authoritative dbt project projection could not be resolved.'
    );
  }

  const provenanceMismatch = findProvenanceMismatch(projection, provenance);
  if (provenanceMismatch !== null) {
    return reject('dbt_project_preview_provenance_stale', provenanceMismatch);
  }

  const canonicalGraph = buildAuthoritativeGraph(projection, provenance.selectedUniqueIds);
  if (!canonicalGraph.ok) {
    return canonicalGraph;
  }
  if (!sameGraphSource(input.graphSource, canonicalGraph.value)) {
    return reject(
      'dbt_project_graph_source_mismatch',
      'Browser graph semantics do not match the current authoritative dbt project projection.'
    );
  }

  const compilation = await deps.dbtCompilation.execute({
    scope: { tenantId: context.scope.tenantId.value, projectId, environmentId },
    projectRoot: provenance.projectRoot,
    contentSetSha256: provenance.contentSetSha256,
    dbtVersion: provenance.dbtVersion,
    adapter: provenance.executionTarget.adapter,
    targetName: provenance.executionTarget.targetName,
    resources: projection.nodes.filter((node) =>
      provenance.selectedUniqueIds.includes(node.uniqueId)
    ),
  });
  if (!compilation.ok) {
    return reject('dbt_project_compilation_required', compilation.reason);
  }
  // Compilation is asynchronous: re-use the authority owner to reject edits or
  // destination changes that occurred while dbt was working, before persisting a plan.
  try {
    const current = await deps.projectGraph.execute({
      canvasId: provenance.canvasId,
      scope: { tenantId: context.scope.tenantId.value, projectId, environmentId },
    });
    const mismatch = findProvenanceMismatch(current, provenance);
    if (mismatch !== null) return reject('dbt_project_preview_provenance_stale', mismatch);
  } catch {
    return reject(
      'dbt_project_preview_projection_unavailable',
      'The dbt authority could not be confirmed after compilation.'
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
        .sort(compareGraphIds),
    },
  };
}
