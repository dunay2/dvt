/** Owned concern: construct one retry-safe Source Import command from wizard intent. */
import type { ImportSourcesInput } from '../../ports/workspace';
import { createBrowserIdempotencyKey } from '../../services/idempotency/createBrowserIdempotencyKey';

export type SourceImportCommandDraft = Omit<ImportSourcesInput, 'schemaVersion' | 'idempotencyKey'>;

export type SourceImportCommandIdentity = Readonly<{
  signature: string;
  idempotencyKey: string;
}>;

type CreateIdempotencyKey = () => string;

function buildCommandSignature(command: SourceImportCommandDraft): string {
  const exactTargets = [...(command.existingDbtSourceTargets ?? [])]
    .sort((left, right) => left.sourceUniqueId.localeCompare(right.sourceUniqueId))
    .map((target) => ({
      objectId: target.objectId,
      sourceUniqueId: target.sourceUniqueId,
      filePath: target.filePath,
      sourceName: target.sourceName,
      tableName: target.tableName,
    }));
  return JSON.stringify({
    canvasId: command.canvasId,
    connectionId: command.connectionId,
    objectIds: command.objects.map(({ objectId }) => objectId).sort(),
    groupingStrategy: command.groupingStrategy,
    includeColumns: command.includeColumns,
    addTests: command.addTests,
    addFreshness: command.addFreshness,
    exactTargets,
  });
}

export function createSourceImportIdempotencyKey(): string {
  return createBrowserIdempotencyKey('source-import');
}

export function resolveSourceImportCommandIdentity(
  command: SourceImportCommandDraft,
  previous: SourceImportCommandIdentity | null,
  createIdempotencyKey: CreateIdempotencyKey = createSourceImportIdempotencyKey
): SourceImportCommandIdentity {
  const signature = buildCommandSignature(command);
  if (previous?.signature === signature) {
    return previous;
  }

  return {
    signature,
    idempotencyKey: createIdempotencyKey(),
  };
}

export function buildSourceImportCommand(
  command: SourceImportCommandDraft,
  identity: SourceImportCommandIdentity
): ImportSourcesInput {
  return {
    schemaVersion: 'source-import-request.v2',
    idempotencyKey: identity.idempotencyKey,
    ...command,
  };
}
