import { DbtProjectGraphProjectionSchema, type DbtProjectGraphProjection } from '@dvt/contracts';

import type {
  IDbtExecutionConnectionBindingVerifier,
  IDbtExecutionTargetResolver,
} from '../ports/dbtExecutionTarget.js';
import type {
  DbtProjectAnalysisResource,
  DbtProjectSourceIdentityRef,
  IDbtProjectAnalyzerPort,
} from '../ports/dbtProjectAnalysis.js';
import { DbtProjectFileAuthorityRequiredError } from '../ports/dbtProjectImport.js';
import type { IWarehouseConnectionCatalog } from '../ports/warehouseSourceImport.js';
import { WarehouseConnectionNotFoundError } from '../ports/warehouseSourceImport.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';

export type ProjectDbtGraphFromFilesInput = Readonly<{
  scope: WorkspaceStorageScope;
  canvasId: string;
  includeGovernedSourceIdentity?: boolean;
}>;

export class ProjectDbtGraphFromFilesUseCase {
  public constructor(
    private readonly deps: {
      readonly analyzer: IDbtProjectAnalyzerPort;
      readonly authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolve'>;
      readonly executionTargetResolver: IDbtExecutionTargetResolver;
      readonly executionConnectionBindingVerifier: IDbtExecutionConnectionBindingVerifier;
      readonly connectionCatalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
    }
  ) {}

  public async execute(input: ProjectDbtGraphFromFilesInput): Promise<DbtProjectGraphProjection> {
    const authorityBinding = await this.deps.authorityPolicy.resolve({
      ...input.scope,
      canvasId: input.canvasId,
    });
    if (authorityBinding.authority.kind !== 'dbt-project-files') {
      throw new DbtProjectFileAuthorityRequiredError();
    }

    const analysis = await this.deps.analyzer.analyze({
      scope: input.scope,
      projectRoot: authorityBinding.authority.projectRoot,
    });
    const connectionLookups = new Map<
      string,
      ReturnType<IWarehouseConnectionCatalog['getConnection']>
    >();
    const nodes = (
      await Promise.all(
        analysis.resources.map(async (resource) => {
          const sourceIdentity =
            input.includeGovernedSourceIdentity === true
              ? await resolveSourceIdentity(
                  resource.sourceIdentityRef,
                  input.scope,
                  this.deps.connectionCatalog,
                  connectionLookups
                )
              : undefined;
          const projectedResource = projectAnalysisResource(resource);
          return {
            ...projectedResource,
            ...(sourceIdentity === undefined ? {} : { sourceIdentity }),
            visualEditability: resolveVisualEditability({
              codeOnlyReasons: resource.codeOnlyReasons,
              packageName: projectedResource.packageName,
              ...(projectedResource.descriptionFilePath === undefined
                ? {}
                : { descriptionFilePath: projectedResource.descriptionFilePath }),
              ...(analysis.projectRevision.projectName === undefined
                ? {}
                : { projectName: analysis.projectRevision.projectName }),
            }),
          };
        })
      )
    ).sort((left, right) => left.uniqueId.localeCompare(right.uniqueId));
    const edges = analysis.dependencies
      .map((dependency) => ({
        id: `${dependency.sourceUniqueId}->${dependency.targetUniqueId}:${dependency.relation}`,
        ...dependency,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
    const executionTarget = this.deps.executionTargetResolver.resolve();
    const executionDiagnostics = await resolveExecutionDiagnostics({
      analysisStatus: analysis.status,
      adapterType: analysis.adapterType,
      dbtVersion: analysis.projectRevision.dbtVersion,
      executionTarget,
      executionConnectionBindingVerifier: this.deps.executionConnectionBindingVerifier,
      scope: input.scope,
      connectionCatalog: this.deps.connectionCatalog,
      connectionLookups,
    });
    const executable = analysis.status === 'valid' && executionDiagnostics.length === 0;

    return DbtProjectGraphProjectionSchema.parse({
      schemaVersion: 'dbt-project-graph-projection.v1',
      authorityBinding,
      freshness: analysis.status === 'valid' ? 'fresh' : analysis.status,
      projectRevision: analysis.projectRevision,
      analysisSha256: analysis.analysisSha256,
      ...(analysis.adapterType === undefined ? {} : { adapterType: analysis.adapterType }),
      nodes,
      edges,
      diagnostics: [...analysis.diagnostics, ...executionDiagnostics],
      ...(executionTarget === null ? {} : { executionTarget }),
      capabilities: {
        canPreview: executable,
        canRun: executable,
        codeOnlyResourceCount: nodes.filter((node) => node.visualEditability.status === 'code_only')
          .length,
      },
    });
  }
}

function projectAnalysisResource(resource: DbtProjectAnalysisResource) {
  return {
    uniqueId: resource.uniqueId,
    resourceType: resource.resourceType,
    name: resource.name,
    ...(resource.identifier === undefined ? {} : { identifier: resource.identifier }),
    packageName: resource.packageName,
    ...(resource.originalFilePath === undefined
      ? {}
      : { originalFilePath: resource.originalFilePath }),
    ...(resource.descriptionFilePath === undefined
      ? {}
      : { descriptionFilePath: resource.descriptionFilePath }),
    ...(resource.sourceName === undefined ? {} : { sourceName: resource.sourceName }),
    ...(resource.description === undefined ? {} : { description: resource.description }),
    ...(resource.materialized === undefined ? {} : { materialized: resource.materialized }),
    columns: resource.columns,
    tags: resource.tags,
    ...(resource.testMetadata === undefined ? {} : { testMetadata: resource.testMetadata }),
  };
}

export async function resolveSourceIdentity(
  identityRef: DbtProjectSourceIdentityRef | undefined,
  scope: WorkspaceStorageScope,
  connectionCatalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>,
  connectionLookups?: Map<string, ReturnType<IWarehouseConnectionCatalog['getConnection']>>
): Promise<DbtProjectGraphProjection['nodes'][number]['sourceIdentity'] | undefined> {
  if (identityRef === undefined) return undefined;

  try {
    const connection = await getCatalogConnection(
      identityRef.connectionId,
      scope,
      connectionCatalog,
      connectionLookups
    );
    return {
      database: identityRef.database,
      connectionName: connection.name,
      schema: identityRef.schema,
      databaseUser: identityRef.databaseUser,
    };
  } catch (error) {
    if (error instanceof WarehouseConnectionNotFoundError) return undefined;
    throw error;
  }
}

function resolveVisualEditability(
  input: Readonly<{
    codeOnlyReasons: readonly string[];
    descriptionFilePath?: string;
    packageName: string;
    projectName?: string;
  }>
): DbtProjectGraphProjection['nodes'][number]['visualEditability'] {
  const reasons = [...new Set(input.codeOnlyReasons)].sort();
  if (
    input.projectName !== undefined &&
    input.packageName === input.projectName &&
    input.descriptionFilePath !== undefined
  ) {
    return {
      status: 'partially_editable',
      operations: ['yaml_description'],
      reasons,
    };
  }
  return {
    status: 'code_only',
    reasons: [
      ...new Set([
        ...reasons,
        ...(input.projectName !== undefined && input.packageName !== input.projectName
          ? ['external_package']
          : []),
      ]),
    ].sort(),
  };
}

async function resolveExecutionDiagnostics({
  analysisStatus,
  adapterType,
  dbtVersion,
  executionTarget,
  executionConnectionBindingVerifier,
  scope,
  connectionCatalog,
  connectionLookups,
}: Readonly<{
  analysisStatus: 'valid' | 'invalid' | 'unavailable';
  adapterType?: string | undefined;
  dbtVersion?: string | undefined;
  executionTarget: ReturnType<IDbtExecutionTargetResolver['resolve']>;
  executionConnectionBindingVerifier: IDbtExecutionConnectionBindingVerifier;
  scope: WorkspaceStorageScope;
  connectionCatalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
  connectionLookups: Map<string, ReturnType<IWarehouseConnectionCatalog['getConnection']>>;
}>): Promise<DbtProjectGraphProjection['diagnostics']> {
  if (analysisStatus !== 'valid') return [];

  if (adapterType === undefined) {
    return [
      {
        code: 'dbt_analysis_adapter_unknown',
        severity: 'error',
        message: 'The analyzed dbt project does not identify its adapter.',
      },
    ];
  }
  if (dbtVersion === undefined) {
    return [
      {
        code: 'dbt_analysis_version_unknown',
        severity: 'error',
        message: 'The analyzed dbt project does not identify its dbt version.',
      },
    ];
  }
  if (executionTarget === null) {
    return [
      {
        code: 'dbt_execution_target_unavailable',
        severity: 'error',
        message: 'No server-owned dbt execution target is configured for this environment.',
      },
    ];
  }
  if (executionTarget.adapter !== adapterType) {
    return [
      {
        code: 'dbt_execution_target_adapter_mismatch',
        severity: 'error',
        message: `The configured ${executionTarget.adapter} target cannot execute this ${adapterType} project.`,
      },
    ];
  }

  try {
    const connection = await getCatalogConnection(
      executionTarget.connectionRef.connectionId,
      scope,
      connectionCatalog,
      connectionLookups
    );
    if (
      connection.id !== executionTarget.connectionRef.connectionId ||
      connection.type !== executionTarget.connectionRef.provider
    ) {
      return [
        {
          code: 'dbt_execution_connection_invalid',
          severity: 'error',
          message:
            'The configured dbt execution connection does not match its workspace catalog entry.',
        },
      ];
    }
    if (
      connection.credentialRef === undefined ||
      !(await executionConnectionBindingVerifier.verify({
        runtimeCredentialRef: executionTarget.credentialRef,
        targetProfile: executionTarget.targetName,
        connectionCredentialRef: connection.credentialRef,
      }))
    ) {
      return [
        {
          code: 'dbt_execution_connection_binding_invalid',
          severity: 'error',
          message:
            'The configured dbt profile does not resolve to its governed workspace connection.',
        },
      ];
    }
  } catch (error) {
    if (error instanceof WarehouseConnectionNotFoundError) {
      return [
        {
          code: 'dbt_execution_connection_missing',
          severity: 'error',
          message: 'The configured dbt execution connection is not available in this workspace.',
        },
      ];
    }
    throw error;
  }
  return [];
}

async function getCatalogConnection(
  connectionId: string,
  scope: WorkspaceStorageScope,
  connectionCatalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>,
  connectionLookups?: Map<string, ReturnType<IWarehouseConnectionCatalog['getConnection']>>
): ReturnType<IWarehouseConnectionCatalog['getConnection']> {
  let connectionLookup = connectionLookups?.get(connectionId);
  if (connectionLookup === undefined) {
    connectionLookup = connectionCatalog.getConnection(scope, connectionId);
    connectionLookups?.set(connectionId, connectionLookup);
  }
  return connectionLookup;
}
