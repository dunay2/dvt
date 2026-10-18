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
} from '../ports/localDataPlane.js';

import type { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';
import {
  LocalDataAuthorizationError,
  LocalDataAuthorizationLease,
} from './localDataAuthorizationLease.js';

type Dependencies = Readonly<{
  authorizer: Pick<AuthorizeCommandScopeService, 'authorizeMany'>;
  clock: () => Date;
  createReader: (
    scope: WorkspaceGraphDraftScope,
    access: ILocalDataOperationAccess
  ) => {
    readGeneration(
      datasetId: string,
      generationId: string
    ): Promise<LocalDataGenerationManifestV1 | null>;
  };
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
    const parsedScope = WorkspaceGraphDraftScopeSchema.safeParse(context?.scope);
    const parsedSelection = DataAccessSelectionSchema.safeParse(input);
    if (
      !parsedScope.success ||
      !parsedSelection.success ||
      parsedSelection.data.mode !== 'local' ||
      !LocalDatasetIdV1Schema.safeParse(parsedSelection.data.localDatasetId).success ||
      !LocalDataGenerationIdV1Schema.safeParse(parsedSelection.data.generationId).success ||
      typeof context?.requestId !== 'string' ||
      !context.requestId.trim()
    ) {
      throw new LocalDataReadError('INVALID_INPUT');
    }
    const scope = Object.freeze(parsedScope.data);
    const selection = Object.freeze(parsedSelection.data);
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
      const borrowed = await reader.readGeneration(
        selection.localDatasetId,
        selection.generationId
      );
      // Own the boundary value before authorization callbacks can mutate a borrowed object.
      const manifest =
        borrowed === null ? null : LocalDataGenerationManifestV1Schema.parse(borrowed);
      if (manifest !== null && !matchesLocalDataGenerationSelectionV1(selection, manifest)) {
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
