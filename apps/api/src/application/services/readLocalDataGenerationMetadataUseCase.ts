/**
 * @sourceResponsibilities v1
 * @component SYS-API-APPLICATION-SERVICES
 * @responsibility RESP-LOCAL-AUTHORIZED-METADATA-READ "Enforce current authorization across an exact metadata read."
 * @implements ReadLocalDataGenerationMetadataUseCase.read
 * @test "apps/api/test/application/services/readLocalDataGenerationMetadataUseCase.test.ts"
 * @responsibility RESP-LOCAL-CAPTURE-SELECTION "Validate an exact dataset and capture selector."
 * @implements ReadLocalDataGenerationMetadataUseCase.readCapture
 * @test "apps/api/test/application/services/readLocalDataGenerationMetadataUseCase.test.ts"
 * @responsibility RESP-LOCAL-GENERATION-SELECTION "Validate an exact dataset and generation selector."
 * @implements ReadLocalDataGenerationMetadataUseCase.readGeneration
 * @test "apps/api/test/application/services/readLocalDataGenerationMetadataUseCase.test.ts"
 */
/**
 * Owned concern: authorize one exact, row-free LOCAL generation lookup.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Revalidate current workspace access before storage and before publishing its result.
 * @consequence IDs never grant access; storage errors cannot become absence or expose native paths.
 * @version 1.0.0
 */
import {
  DataAccessSelectionSchema,
  LocalDatasetIdV1Schema,
  LocalDataGenerationIdV1Schema,
  LocalDataCaptureIdV1Schema,
  WorkspaceGraphDraftScopeSchema,
  matchesLocalDataGenerationSelectionV1,
  LocalDataGenerationManifestV1Schema,
  type DataAccessSelection,
  type LocalDataGenerationManifestV1,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';
import { buildEnvironmentAccessScope } from '../ports/accessDecision.js';
import type {
  ILocalDataGenerationReader,
  ILocalDataOperationAccess,
  LocalDataOperationContext,
  LocalDataCaptureSelection,
} from '../ports/localDataPlane.js';

import type { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';
import {
  LocalDataAuthorizationError,
  LocalDataAuthorizationLease,
} from './localDataAuthorizationLease.js';

type GenerationMetadataReader = {
  readGeneration(
    datasetId: string,
    generationId: string
  ): Promise<LocalDataGenerationManifestV1 | null>;
  readCapture(datasetId: string, captureId: string): Promise<LocalDataGenerationManifestV1 | null>;
};

type Dependencies = Readonly<{
  authorizer: Pick<AuthorizeCommandScopeService, 'authorizeMany'>;
  clock: () => Date;
  createReader: (
    scope: WorkspaceGraphDraftScope,
    access: ILocalDataOperationAccess
  ) => GenerationMetadataReader;
}>;

export class LocalDataReadError extends Error {
  public constructor(readonly code: 'INVALID_INPUT' | 'GENERATION_MISMATCH' | 'READ_FAILED') {
    super(`LOCAL generation read rejected: ${code}`);
    this.name = 'LocalDataReadError';
  }
}

export class ReadLocalDataGenerationMetadataUseCase implements ILocalDataGenerationReader {
  public constructor(private readonly deps: Dependencies) {}

  public async readGeneration(
    context: LocalDataOperationContext,
    input: Extract<DataAccessSelection, { mode: 'local' }>
  ): Promise<LocalDataGenerationManifestV1 | null> {
    const parsedSelection = DataAccessSelectionSchema.safeParse(input);
    if (
      !parsedSelection.success ||
      parsedSelection.data.mode !== 'local' ||
      !LocalDatasetIdV1Schema.safeParse(parsedSelection.data.localDatasetId).success ||
      !LocalDataGenerationIdV1Schema.safeParse(parsedSelection.data.generationId).success
    ) {
      throw new LocalDataReadError('INVALID_INPUT');
    }
    const selection = Object.freeze(parsedSelection.data);
    return this.read(
      context,
      (reader) => reader.readGeneration(selection.localDatasetId, selection.generationId),
      (manifest) => matchesLocalDataGenerationSelectionV1(selection, manifest)
    );
  }

  public async readCapture(
    context: LocalDataOperationContext,
    input: LocalDataCaptureSelection
  ): Promise<LocalDataGenerationManifestV1 | null> {
    if (
      typeof input !== 'object' ||
      input === null ||
      Array.isArray(input) ||
      Object.keys(input).some((key) => key !== 'localDatasetId' && key !== 'captureId')
    ) {
      throw new LocalDataReadError('INVALID_INPUT');
    }
    // Invoke each public parser independently; API and contracts use different Zod majors.
    const dataset = LocalDatasetIdV1Schema.safeParse(input.localDatasetId);
    const capture = LocalDataCaptureIdV1Schema.safeParse(input.captureId);
    if (!dataset.success || !capture.success) throw new LocalDataReadError('INVALID_INPUT');
    const selection = Object.freeze({ localDatasetId: dataset.data, captureId: capture.data });
    return this.read(
      context,
      (reader) => reader.readCapture(selection.localDatasetId, selection.captureId),
      (manifest) =>
        manifest.localDatasetId === selection.localDatasetId &&
        manifest.captureId === selection.captureId
    );
  }

  private async read(
    context: LocalDataOperationContext,
    lookup: (reader: GenerationMetadataReader) => Promise<LocalDataGenerationManifestV1 | null>,
    matches: (manifest: LocalDataGenerationManifestV1) => boolean
  ): Promise<LocalDataGenerationManifestV1 | null> {
    const parsedScope = WorkspaceGraphDraftScopeSchema.safeParse(context?.scope);
    if (
      !parsedScope.success ||
      typeof context?.requestId !== 'string' ||
      !context.requestId.trim()
    ) {
      throw new LocalDataReadError('INVALID_INPUT');
    }
    const scope = Object.freeze(parsedScope.data);
    const lease = await LocalDataAuthorizationLease.open(
      {
        principal: context.principal,
        requestId: context.requestId,
        operation: 'view',
        scope: buildEnvironmentAccessScope(
          TenantId.unsafe(scope.tenantId),
          ProjectId.unsafe(scope.projectId),
          EnvironmentId.unsafe(scope.environmentId)
        ),
      },
      { authorizer: this.deps.authorizer, clock: this.deps.clock }
    );
    try {
      const reader = this.deps.createReader(scope, lease);
      const borrowed = await lookup(reader);
      // Own the boundary value before authorization callbacks can mutate a borrowed object.
      const manifest =
        borrowed === null ? null : LocalDataGenerationManifestV1Schema.parse(borrowed);
      if (manifest !== null && !matches(manifest)) {
        throw new LocalDataReadError('GENERATION_MISMATCH');
      }
      await lease.checkpoint();
      return manifest;
    } catch (error) {
      if (error instanceof LocalDataReadError || error instanceof LocalDataAuthorizationError)
        throw error;
      throw new LocalDataReadError('READ_FAILED');
    } finally {
      lease.close();
    }
  }
}
