/** Publish an independent SQL worksheet to its selected file-authoritative dbt project. */
import path from 'node:path';

import {
  asSha256HexString,
  WorksheetDbtModelRequestSchema,
  type CanvasAuthoringAuthorityResolution,
  type DbtProjectGraphProjection,
  type WorksheetDbtModelRequest,
  type WorksheetDbtModelResult,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import type { ICanvasAuthoringAuthorityStore } from '../ports/canvasAuthoringAuthority.js';
import {
  WorkspaceFileBatchIdempotencyConflictError,
  WorkspaceFileNotFoundError,
  type IWorkspaceFileBatchMutationPort,
  type IWorkspaceFileRepository,
  type WorkspaceFileContent,
  type WorkspaceStorageScope,
} from '../ports/workspaceFiles.js';

import { parsePostgresTransformSqlStructure } from './postgresTransformSqlPolicy.js';

type Scope = WorkspaceStorageScope;
type ModelDirectory = Readonly<{
  projectName: string;
  directory: string;
  workspaceDirectory: string;
}>;
type ProjectCatalog = Readonly<{
  freshness: DbtProjectGraphProjection['freshness'];
  projectRevision: Pick<DbtProjectGraphProjection['projectRevision'], 'projectRoot'>;
  nodes: readonly Pick<
    DbtProjectGraphProjection['nodes'][number],
    'resourceType' | 'name' | 'originalFilePath' | 'packageName'
  >[];
}>;
type Dependencies = Readonly<{
  files: Pick<IWorkspaceFileRepository, 'getFileContent'>;
  batch: IWorkspaceFileBatchMutationPort;
  withLock: ICanvasAuthoringAuthorityStore['withGraphArtifactPublicationLock'];
  resolveAuthority: (scope: Scope, path: string) => Promise<CanvasAuthoringAuthorityResolution>;
  modelDirectory: (configuration: WorkspaceFileContent) => ModelDirectory | null;
  projectGraph: (input: Readonly<{ scope: Scope; canvasId: string }>) => Promise<ProjectCatalog>;
}>;

function catalogRefusal(
  catalog: ProjectCatalog,
  target: ModelDirectory,
  request: WorksheetDbtModelRequest
): WorksheetDbtModelResult | undefined {
  if (catalog.freshness !== 'fresh' || catalog.projectRevision.projectRoot !== request.projectRoot)
    return { kind: 'refused', reason: 'project_unavailable' };
  const conflict = catalog.nodes.some(
    (node) =>
      ['model', 'seed', 'snapshot'].includes(node.resourceType) &&
      node.packageName === target.projectName &&
      node.name === request.name &&
      node.originalFilePath !== path.posix.join(target.directory, request.name + '.sql')
  );
  if (conflict) return { kind: 'refused', reason: 'conflict' };
}

export class CreateWorksheetDbtModel {
  constructor(private readonly deps: Dependencies) {}

  async execute(scope: Scope, input: WorksheetDbtModelRequest): Promise<WorksheetDbtModelResult> {
    const request = WorksheetDbtModelRequestSchema.parse(input);
    if (/\{[{%#]/.test(request.sql)) return { kind: 'refused', reason: 'invalid_sql' };
    const parsed = await parsePostgresTransformSqlStructure(request.sql);
    if (parsed.status !== 'valid') return { kind: 'refused', reason: 'invalid_sql' };
    const content = parsed.canonicalSql.trimEnd().replace(/;$/, '') + '\n';
    try {
      return await this.deps.withLock(
        { key: { ...scope, canvasId: request.canvasId }, projectRoot: request.projectRoot },
        () => this.publish(scope, request, content)
      );
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError)
        return { kind: 'refused', reason: 'project_unavailable' };
      if (error instanceof WorkspaceFileBatchIdempotencyConflictError)
        return { kind: 'refused', reason: 'conflict' };
      throw error;
    }
  }

  private async publish(
    scope: Scope,
    request: WorksheetDbtModelRequest,
    content: string
  ): Promise<WorksheetDbtModelResult> {
    const configPath = path.posix.join(request.projectRoot, 'dbt_project.yml');
    if (!(await this.ownsPath(scope, request, configPath)))
      return { kind: 'refused', reason: 'project_unavailable' };
    const config = await this.deps.files.getFileContent(scope, configPath);
    if (config.contentSha256 !== request.configSha256)
      return { kind: 'refused', reason: 'conflict' };
    const target = this.deps.modelDirectory(config);
    if (!target) return { kind: 'refused', reason: 'project_unavailable' };
    const modelPath = path.posix.join(target.workspaceDirectory, request.name + '.sql');
    if (!(await this.ownsPath(scope, request, modelPath)))
      return { kind: 'refused', reason: 'project_unavailable' };
    const catalog = await this.deps.projectGraph({ scope, canvasId: request.canvasId });
    const refusal = catalogRefusal(catalog, target, request);
    if (refusal) return refusal;
    const receipt = await this.deps.batch.apply(scope, {
      idempotencyKey: 'worksheet-dbt-' + request.requestId,
      expectedFiles: [
        { path: configPath, expectedContentSha256: config.contentSha256 },
        { path: modelPath },
      ],
      writes: [{ path: modelPath, content }],
      deletes: [],
    });
    if (receipt.kind === 'conflict') return { kind: 'refused', reason: 'conflict' };
    return {
      kind: 'created',
      path: modelPath,
      contentSha256: asSha256HexString(sha256HexUtf8(content)),
    };
  }

  private async ownsPath(scope: Scope, request: WorksheetDbtModelRequest, file: string) {
    const authority = await this.deps.resolveAuthority(scope, file);
    return (
      authority.kind === 'resolved' &&
      authority.binding.canvasId === request.canvasId &&
      authority.binding.authority.kind === 'dbt-project-files' &&
      authority.binding.authority.projectRoot === request.projectRoot
    );
  }
}
