/**
 * @sourceResponsibilities v1
 * @component SYS-API-RUNTIME-COMPOSITION
 * @responsibility RESP-LOCAL-CAPTURE-COMPOSITION "Wire the LOCAL capture use case to protected source and storage dependencies."
 * @implements buildLocalDataCaptureRuntime
 * @test "apps/api/test/architecture/localDataCaptureComposition.architecture.test.ts"
 * @test "apps/api/test/modules/localDataCaptureRuntime.test.ts"
 * @responsibility RESP-LOCAL-METADATA-READER-COMPOSITION "Wire exact metadata reads without creating absent workspace storage."
 * @implements buildLocalDataCaptureRuntime
 * @test "apps/api/test/architecture/localDataCaptureComposition.architecture.test.ts"
 * @test "apps/api/test/modules/localDataCaptureRuntime.test.ts"
 */
/**
 * Owned concern: bind the internal LOCAL command/query to existing protected infrastructure.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Share one workspace runtime, current authorization, catalog and credential resolver.
 * @consequence Disabled LOCAL exposes no capability; no native handle or generic SQL is returned.
 * @version 1.0.0
 */
import type { IPostgresCredentialBindingResolver } from '@dvt/adapter-postgres';

import type {
  LocalDataCaptureLimits,
  LocalDataCaptureRuntime,
} from '../../application/ports/localDataAcquisition.js';
import type { IWarehouseConnectionCatalog } from '../../application/ports/warehouseSourceImport.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { CaptureLocalDatasetUseCase } from '../../application/services/captureLocalDatasetUseCase.js';
import { ReadLocalDataGenerationMetadataUseCase } from '../../application/services/readLocalDataGenerationMetadataUseCase.js';
import { validateLocalDataLimits } from '../../domain/localDataBatch.js';
import { DuckDbGenerationStore } from '../../infrastructure/duckdb/DuckDbGenerationStore.js';
import type { DuckDbLocalDataRuntime } from '../../infrastructure/duckdb/DuckDbLocalDataRuntime.js';
import { PostgresRemoteDatasetReader } from '../../infrastructure/postgres/PostgresRemoteDatasetReader.js';
import type { LocalDataConfiguration } from '../../plugins/localDataEnv.js';

export type LocalDataCaptureConfiguration = Readonly<{
  limits: LocalDataCaptureLimits;
  batchRows: number;
  timeoutMs: number;
}>;
type Dependencies = Readonly<{
  configuration: LocalDataConfiguration;
  runtime: DuckDbLocalDataRuntime;
  authorizer: Pick<AuthorizeCommandScopeService, 'authorizeMany'>;
  catalog: Pick<IWarehouseConnectionCatalog, 'getConnection'>;
  credentials: IPostgresCredentialBindingResolver;
  clock: () => Date;
  capture: LocalDataCaptureConfiguration;
}>;

export function buildLocalDataCaptureRuntime(
  deps: Dependencies
): LocalDataCaptureRuntime | undefined {
  if (deps.configuration.kind === 'disabled') return undefined;
  const limits = validateLocalDataLimits(deps.capture.limits);
  const captureLocalDataset = new CaptureLocalDatasetUseCase({
    authorizer: deps.authorizer,
    catalog: deps.catalog,
    clock: deps.clock,
    reader: new PostgresRemoteDatasetReader(deps.credentials),
    limits,
    batchRows: deps.capture.batchRows,
    timeoutMs: deps.capture.timeoutMs,
    createWriter: (scope, access, caps) =>
      new DuckDbGenerationStore(deps.runtime, scope, access, caps),
  });
  const readLocalDataGenerationMetadata = new ReadLocalDataGenerationMetadataUseCase({
    authorizer: deps.authorizer,
    clock: deps.clock,
    createReader: (scope, access) => ({
      readGeneration: async (datasetId, generationId) => {
        if (!(await deps.runtime.hasWorkspaceDatabase(scope))) return null;
        return new DuckDbGenerationStore(deps.runtime, scope, access, limits).readGeneration(
          datasetId,
          generationId
        );
      },
      readCapture: async (datasetId, captureId) => {
        if (!(await deps.runtime.hasWorkspaceDatabase(scope))) return null;
        return new DuckDbGenerationStore(deps.runtime, scope, access, limits).readCapture(
          datasetId,
          captureId
        );
      },
    }),
  });
  return Object.freeze({ captureLocalDataset, readLocalDataGenerationMetadata });
}
