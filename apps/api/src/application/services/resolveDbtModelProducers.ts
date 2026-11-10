/** Bind selected file-model references through the existing native analyzer and authority policy. */
import { readWorkspaceDbtModelReference, CompileGraphDbtModelsRequestSchema } from '@dvt/contracts';
import {
  projectExternalProducerAst,
  resolvePostgresInputDataType,
  sourceFieldType,
} from '@dvt/postgres-projection';
import { createExternalProducerSignature } from '@dvt/substrait-analysis';

import { AUTHORIZATION_ACTION } from '../ports/accessDecision.js';
import {
  DbtModelProducerAccessDeniedError,
  type IDbtModelProducerResolver,
  type DbtModelProducer,
} from '../ports/dbtModelProducer.js';
import type { IDbtProjectAnalyzerPort } from '../ports/dbtProjectAnalysis.js';

import type { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';
import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';
import { sameConnection } from './dvtSourceCoverage.js';
import { parsePostgresTransformSqlStructure } from './postgresTransformSqlPolicy.js';
import type { ProjectDbtGraphFromFilesUseCase } from './projectDbtGraphFromFilesUseCase.js';

export class ResolveDbtModelProducers implements IDbtModelProducerResolver {
  public constructor(
    private readonly deps: Readonly<{
      analyzer: IDbtProjectAnalyzerPort;
      authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolve'>;
      projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'projectValidatedAnalysis'>;
      authorizer: Pick<AuthorizeCommandScopeService, 'authorize'>;
    }>
  ) {}

  public async resolve(
    nodes: Parameters<IDbtModelProducerResolver['resolve']>[0],
    context: Parameters<IDbtModelProducerResolver['resolve']>[1]
  ): ReturnType<IDbtModelProducerResolver['resolve']> {
    const groups = new Map<
      string,
      {
        nodeId: string;
        reference: NonNullable<ReturnType<typeof readWorkspaceDbtModelReference>>;
      }[]
    >();
    for (const node of nodes) {
      const reference = readWorkspaceDbtModelReference(node);
      if (reference == null) continue;
      if (
        node.pluginId !== 'dvt' ||
        node.role !== 'transform' ||
        !['transform', 'dvt:transform'].includes(node.kind) ||
        node.metadata?.['transformAuthoring'] != null
      )
        throw new Error('A file-model reference cannot carry competing semantic authority.');
      const group = groups.get(reference.canvasId) ?? [];
      group.push({ nodeId: node.id, reference });
      groups.set(reference.canvasId, group);
    }
    const results = new Map<string, DbtModelProducer>();
    if (groups.size === 0) return results;
    const permission = await this.deps.authorizer.authorize(
      context.principal,
      { ...context.scope, action: AUTHORIZATION_ACTION.workspaceFilesView },
      context.requestId
    );
    const projectId = context.scope.projectId?.value;
    const environmentId = context.scope.environmentId?.value;
    if (!permission.ok) throw new DbtModelProducerAccessDeniedError();
    if (projectId == null || environmentId == null)
      throw new Error('Scoped file-model access is unavailable.');
    const scope = { tenantId: context.scope.tenantId.value, projectId, environmentId };
    for (const [canvasId, group] of groups) {
      const binding = await this.deps.authorityPolicy.resolve({ ...scope, canvasId });
      if (binding.authority.kind !== 'dbt-project-files')
        throw new Error('File-model authority is unavailable.');
      const selectors = [...new Set(group.map(({ reference }) => reference.uniqueId))].sort();
      CompileGraphDbtModelsRequestSchema.parse({ canvasId, selectors });
      const analysis = await this.deps.analyzer.analyze({
        scope,
        projectRoot: binding.authority.projectRoot,
        operation: {
          kind: 'compile',
          selectors: selectors.map((uniqueId) => uniqueId.slice('model.'.length)),
        },
      });
      const projection = await this.deps.projectGraph.projectValidatedAnalysis(
        { scope, canvasId },
        { scope, analysis }
      );
      const target = projection.executionTarget;
      if (
        analysis.status !== 'valid' ||
        projection.freshness !== 'fresh' ||
        !projection.capabilities.canPreview ||
        target?.connectionRef.provider !== 'postgres'
      )
        throw new Error('A current PostgreSQL model publication is required.');
      const compiled = new Map<
        string,
        Awaited<ReturnType<typeof parsePostgresTransformSqlStructure>>
      >();
      for (const uniqueId of selectors) {
        const sql = analysis.resources.find(
          (resource) => resource.uniqueId === uniqueId && resource.resourceType === 'model'
        )?.compiledSql;
        if (!sql?.trim())
          throw new Error('Native dbt compilation did not return the selected model.');
        const parsed = await parsePostgresTransformSqlStructure(sql);
        if (parsed.status !== 'valid')
          throw new Error('A model producer must compile to one read-only SELECT.');
        compiled.set(uniqueId, parsed);
      }
      for (const { nodeId, reference } of group) {
        const model = projection.nodes.find(
          (node) => node.uniqueId === reference.uniqueId && node.resourceType === 'model'
        );
        if (
          model == null ||
          !sameConnection(reference.connectionRef, target.connectionRef) ||
          reference.fields.some(
            (field) =>
              !model.columns.some(
                (column) => column.name === field.name && column.dataType === field.dataType
              )
          )
        )
          throw new Error('The referenced model fields or execution connection changed.');
        const document = createExternalProducerSignature({
          relationId: reference.relationId,
          names: [canvasId, reference.uniqueId],
          fields: reference.fields.map((field) => ({
            ...field,
            type: sourceFieldType(resolvePostgresInputDataType(field.dataType), field.nullable),
          })),
        });
        const parsed = compiled.get(reference.uniqueId)!;
        if (parsed.status !== 'valid') throw new Error('Compiled model result is unavailable.');
        results.set(nodeId, {
          document,
          connection: target.connectionRef,
          provenance: {
            canvasId,
            uniqueId: reference.uniqueId,
            contentSetSha256: projection.projectRevision.contentSetSha256,
            analysisSha256: projection.analysisSha256,
          },
          projection: projectExternalProducerAst(document, parsed.ast),
        });
      }
    }
    return results;
  }
}
