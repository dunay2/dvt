/** Owned concern: construct one retry-safe Source Import command from wizard intent. */
import type { ImportSourcesInput } from '../../ports/workspace';

export type SourceImportCommandDraft = Omit<ImportSourcesInput, 'schemaVersion' | 'idempotencyKey'>;

export type SourceImportCommandIdentity = Readonly<{
  signature: string;
  idempotencyKey: string;
}>;

type CreateIdempotencyKey = () => string;

function buildCommandSignature(command: SourceImportCommandDraft): string {
  return JSON.stringify({
    canvasId: command.canvasId,
    connectionId: command.connectionId,
    objectIds: command.objects.map(({ objectId }) => objectId).sort(),
    groupingStrategy: command.groupingStrategy,
    includeColumns: command.includeColumns,
    addTests: command.addTests,
    addFreshness: command.addFreshness,
  });
}

export function createSourceImportIdempotencyKey(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid == null) {
    throw new Error('Secure browser UUID support is required for Source Import.');
  }

  return `source-import:${uuid}`;
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
