/** Owned concern: validate and dispatch one Source Import command to persisted Canvas authority. */
import {
  ImportSourceObjectsRequestV2Schema,
  ImportSourceObjectsResultV2Schema,
  isRelationalSourceObject,
} from '@dvt/contracts';

import type {
  ImportWarehouseSourcesInput,
  ImportWarehouseSourcesResult,
} from '../ports/warehouseSourceImport.js';
import {
  InvalidWarehouseSourceImportRequestError,
  SourceObjectNotFoundError,
  UnsupportedSourceObjectImportError,
} from '../ports/warehouseSourceImport.js';

import type { CanvasAuthoringAuthorityPolicy } from './canvasAuthoringAuthorityPolicy.js';
import type { DbtProjectFilesWarehouseSourceImportStrategy } from './dbtProjectFilesWarehouseSourceImportStrategy.js';
import type { GraphDraftWarehouseSourceImportStrategy } from './graphDraftWarehouseSourceImportStrategy.js';
import type { WarehouseConnectionSourceObjectReader } from './WarehouseConnectionSourceObjectReader.js';
import type {
  WarehouseSourceImportCommandContext,
  WarehouseSourceImportStrategyResult,
} from './warehouseSourceImportPlan.js';
import { InvalidWarehouseSourceYamlError } from './warehouseSourceYaml.js';

export class ImportWarehouseSourcesUseCase {
  public constructor(
    private readonly deps: Readonly<{
      sourceObjectReader: Pick<WarehouseConnectionSourceObjectReader, 'read'>;
      authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolve'>;
      graphDraftStrategy: Pick<GraphDraftWarehouseSourceImportStrategy, 'execute'>;
      dbtProjectFilesStrategy: Pick<DbtProjectFilesWarehouseSourceImportStrategy, 'execute'>;
    }>
  ) {}

  public async execute(input: ImportWarehouseSourcesInput): Promise<ImportWarehouseSourcesResult> {
    const request = ImportSourceObjectsRequestV2Schema.safeParse({
      schemaVersion: input.schemaVersion,
      canvasId: input.canvasId,
      idempotencyKey: input.idempotencyKey,
      connectionId: input.connectionId,
      objects: input.objects,
      groupingStrategy: input.groupingStrategy,
      includeColumns: input.includeColumns,
      addTests: input.addTests,
      addFreshness: input.addFreshness,
      ...(input.existingDbtSourceTargets === undefined
        ? {}
        : { existingDbtSourceTargets: input.existingDbtSourceTargets }),
    });
    if (!request.success) {
      throw new InvalidWarehouseSourceImportRequestError(
        'Source Import requires a Canvas, an idempotency key, a known grouping, boolean options, and a non-empty unique object selection.'
      );
    }

    const authorityBinding = await this.deps.authorityPolicy.resolve({
      ...input.scope,
      canvasId: request.data.canvasId,
    });
    if (
      request.data.existingDbtSourceTargets !== undefined &&
      authorityBinding.authority.kind !== 'dbt-project-files'
    ) {
      throw new InvalidWarehouseSourceImportRequestError(
        'Exact dbt source targets require file-backed dbt project authority.'
      );
    }
    const {
      connection,
      databaseUser,
      sourceObjects: catalogSourceObjects,
    } = await this.deps.sourceObjectReader.read(input.scope, request.data.connectionId);
    const sourceObjects = request.data.objects.map(({ objectId }) => {
      const sourceObject = catalogSourceObjects.find(
        (candidate) => candidate.objectId === objectId
      );
      if (!sourceObject) throw new SourceObjectNotFoundError(objectId);
      if (!isRelationalSourceObject(sourceObject)) {
        throw new UnsupportedSourceObjectImportError(
          sourceObject.objectId,
          sourceObject.locator.kind
        );
      }
      return { ...sourceObject, connectionId: request.data.connectionId };
    });
    const relationalCatalogSourceObjects = catalogSourceObjects
      .filter(isRelationalSourceObject)
      .map((sourceObject) => ({ ...sourceObject, connectionId: request.data.connectionId }));
    const context: WarehouseSourceImportCommandContext = {
      scope: input.scope,
      canvasId: request.data.canvasId,
      idempotencyKey: request.data.idempotencyKey,
      connection,
      ...(databaseUser === undefined ? {} : { databaseUser }),
      sourceObjects,
      catalogSourceObjects: relationalCatalogSourceObjects,
      groupingStrategy: request.data.groupingStrategy,
      includeColumns: request.data.includeColumns,
      addTests: request.data.addTests,
      addFreshness: request.data.addFreshness,
      ...(request.data.existingDbtSourceTargets === undefined
        ? {}
        : { existingDbtSourceTargets: request.data.existingDbtSourceTargets }),
    };

    let strategyResult: WarehouseSourceImportStrategyResult;
    try {
      strategyResult =
        authorityBinding.authority.kind === 'graph-draft'
          ? await this.deps.graphDraftStrategy.execute(context, authorityBinding)
          : await this.deps.dbtProjectFilesStrategy.execute(context, authorityBinding);
    } catch (error) {
      if (error instanceof InvalidWarehouseSourceYamlError) {
        throw new InvalidWarehouseSourceImportRequestError(
          error.message,
          'invalid_existing_source_yaml'
        );
      }
      throw error;
    }

    return ImportSourceObjectsResultV2Schema.parse({
      schemaVersion: 'source-import-result.v2',
      success: true,
      idempotencyKey: request.data.idempotencyKey,
      authorityBinding,
      sourcesCreated: strategyResult.sourcesCreated,
      objectsImported: sourceObjects.length,
      yamlFiles: [...strategyResult.yamlFiles],
      grouping: request.data.groupingStrategy,
      options: {
        includeColumns: request.data.includeColumns,
        addTests: request.data.addTests,
        addFreshness: request.data.addFreshness,
      },
      outcome: strategyResult.outcome,
    });
  }
}
