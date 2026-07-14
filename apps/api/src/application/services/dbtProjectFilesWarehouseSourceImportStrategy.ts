import type { CanvasAuthoringAuthorityBinding, DbtProjectGraphProjection } from '@dvt/contracts';

import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
} from '../ports/workspaceFiles.js';

import type { ProjectDbtGraphFromFilesUseCase } from './projectDbtGraphFromFilesUseCase.js';
import {
  applyWarehouseSourceImportFilePlan,
  buildWarehouseSourceImportFilePlan,
  rollbackWarehouseSourceImportFilePlan,
  type WarehouseSourceImportCommandContext,
  type WarehouseSourceImportFilePlan,
  type WarehouseSourceImportStrategyResult,
} from './warehouseSourceImportPlan.js';

type DbtProjectFilesAuthorityBinding = CanvasAuthoringAuthorityBinding &
  Readonly<{ authority: Readonly<{ kind: 'dbt-project-files'; projectRoot: string }> }>;

export class WarehouseSourceImportProjectionError extends Error {
  public constructor() {
    super('The imported warehouse sources could not be proven in a fresh dbt project projection.');
    this.name = 'WarehouseSourceImportProjectionError';
  }
}

export class DbtProjectFilesWarehouseSourceImportStrategy {
  public constructor(
    private readonly deps: Readonly<{
      workspaceFiles: IWorkspaceFileRepository;
      batchMutation: IWorkspaceFileBatchMutationPort;
      projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
    }>
  ) {}

  public async execute(
    context: WarehouseSourceImportCommandContext,
    authorityBinding: CanvasAuthoringAuthorityBinding
  ): Promise<WarehouseSourceImportStrategyResult> {
    if (authorityBinding.authority.kind !== 'dbt-project-files') {
      throw new Error('dbt-file Source Import requires dbt-project-files authority.');
    }

    const filePlan = await buildWarehouseSourceImportFilePlan({
      context,
      workspaceFiles: this.deps.workspaceFiles,
      authorityProjectRoot: authorityBinding.authority.projectRoot,
    });
    const appliedReceipt = await applyWarehouseSourceImportFilePlan({
      context,
      plan: filePlan,
      batchMutation: this.deps.batchMutation,
    });

    try {
      const projection = await this.deps.projectGraph.execute({
        scope: context.scope,
        canvasId: context.canvasId,
      });
      const projectedSourceUniqueIds = verifyProjection(
        projection,
        authorityBinding as DbtProjectFilesAuthorityBinding,
        filePlan
      );

      return {
        sourcesCreated: filePlan.updates.length,
        yamlFiles: filePlan.updates.map((update) => update.path),
        outcome: {
          kind: 'dbt-project-files',
          projectRevision: projection.projectRevision,
          analysisSha256: projection.analysisSha256,
          projectedSourceUniqueIds: [...projectedSourceUniqueIds],
        },
      };
    } catch (error) {
      try {
        await rollbackWarehouseSourceImportFilePlan({
          context,
          plan: filePlan,
          appliedReceipt,
          batchMutation: this.deps.batchMutation,
        });
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Warehouse Source Import projection failed and YAML rollback was incomplete.',
          { cause: rollbackError }
        );
      }
      throw error;
    }
  }
}

function verifyProjection(
  projection: DbtProjectGraphProjection,
  authorityBinding: DbtProjectFilesAuthorityBinding,
  filePlan: WarehouseSourceImportFilePlan
): string[] {
  if (
    projection.freshness !== 'fresh' ||
    projection.authorityBinding.canvasId !== authorityBinding.canvasId ||
    projection.authorityBinding.authority.kind !== 'dbt-project-files' ||
    projection.authorityBinding.authority.projectRoot !== authorityBinding.authority.projectRoot ||
    projection.projectRevision.projectRoot !== authorityBinding.authority.projectRoot
  ) {
    throw new WarehouseSourceImportProjectionError();
  }

  const sourceNodes = projection.nodes.filter((node) => node.resourceType === 'source');
  const projectedSourceUniqueIds = [...filePlan.bindings.values()].map((binding) => {
    const projected = sourceNodes.find(
      (node) =>
        node.sourceName === binding.sourceName &&
        node.name === binding.tableName &&
        node.originalFilePath === binding.path
    );
    if (!projected) throw new WarehouseSourceImportProjectionError();
    return projected.uniqueId;
  });
  const uniqueIds = [...new Set(projectedSourceUniqueIds)].sort((left, right) =>
    left.localeCompare(right)
  );
  if (uniqueIds.length !== filePlan.bindings.size) {
    throw new WarehouseSourceImportProjectionError();
  }
  return uniqueIds;
}
