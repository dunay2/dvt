/** Physical dependency coverage, distinct from the number of logical Read occurrences. */
import type {
  ConnectionRef,
  ConnectedSourceRef,
  WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

export function sameConnection(left: ConnectionRef, right: ConnectionRef): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.connectionId === right.connectionId &&
    left.provider === right.provider
  );
}

export function sameConnectedSource(left: ConnectedSourceRef, right: ConnectedSourceRef): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.sourceObjectId === right.sourceObjectId &&
    sameConnection(left.connectionRef, right.connectionRef)
  );
}

export function hasExactDvtSourceCoverage(
  occurrences: readonly ConnectedSourceRef[],
  sources: readonly ConnectedSourceRef[],
  requireAllSources = true
): boolean {
  return (
    occurrences.length > 0 &&
    occurrences.every(
      (use) => sources.filter((source) => sameConnectedSource(use, source)).length === 1
    ) &&
    (!requireAllSources ||
      sources.every((source) => occurrences.some((use) => sameConnectedSource(use, source))))
  );
}

export function requireDvtProjectedSourceCoverage(
  inputs: readonly Readonly<{ sourceRef: ConnectedSourceRef; schema: string; table: string }>[],
  sources: readonly Readonly<{ node: WorkspaceGraphAuthoringNode; ref: ConnectedSourceRef }>[],
  requireAllSources: boolean
): void {
  if (
    !hasExactDvtSourceCoverage(
      inputs.map((input) => input.sourceRef),
      sources.map((source) => source.ref),
      requireAllSources
    ) ||
    inputs.some(
      (input) =>
        !sources.some(
          ({ node, ref }) =>
            sameConnectedSource(input.sourceRef, ref) &&
            node.metadata?.['schema'] === input.schema &&
            node.metadata?.['tableName'] === input.table
        )
    )
  ) {
    throw new Error('PostgreSQL inputs do not match the protected terminal closure.');
  }
}
