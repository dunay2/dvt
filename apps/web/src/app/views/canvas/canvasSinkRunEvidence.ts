/** Project persisted Sink execution evidence; never query current destination rows. */
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { RunSnapshot } from '../../ports/runs';
import { createDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';

export type CanvasSinkRunEvidence = Readonly<{
  runId: string;
  nodeName: string;
  rowsWritten: number;
  completedAt: string;
  durationMs: number;
  status: 'completed';
}>;

function normalizeRelationPath(value: string): readonly string[] {
  return value
    .split('.')
    .map((part) => {
      const normalized = part.trim().toLowerCase();
      const withoutOpening = ['"', '`', '['].includes(normalized[0] ?? '')
        ? normalized.slice(1)
        : normalized;
      return ['"', '`', ']'].includes(withoutOpening.at(-1) ?? '')
        ? withoutOpening.slice(0, -1)
        : withoutOpening;
    })
    .filter(Boolean);
}

function relationsMatch(nodeRelation: string, materializedRelation: string): boolean {
  const nodeParts = normalizeRelationPath(nodeRelation);
  const materializedParts = normalizeRelationPath(materializedRelation);
  if (nodeParts.length < 2 || materializedParts.length < 2) {
    return false;
  }

  const shorterLength = Math.min(nodeParts.length, materializedParts.length);
  return (
    nodeParts.slice(-shorterLength).join('.') === materializedParts.slice(-shorterLength).join('.')
  );
}

export function resolveCanvasSinkRunEvidence(
  data: DbtNodeData,
  snapshot: RunSnapshot | null | undefined
): CanvasSinkRunEvidence | null {
  const materialization = snapshot?.materialization ?? snapshot?.execution?.materialization;
  const sinkMetadata = createDvtNodeAuthoringMetadata({
    id: data.name,
    name: data.name,
    pluginId: 'dvt',
    kind: 'dvt:sink',
    role: 'output',
    status: 'idle',
    tags: ['authoring'],
    metadata: data.metadata,
  });
  if (
    data.role !== 'output' ||
    data.pluginKind !== 'dvt:sink' ||
    sinkMetadata?.kind !== 'sink' ||
    snapshot?.status !== 'completed' ||
    materialization == null ||
    !relationsMatch(`${sinkMetadata.schema}.${sinkMetadata.table}`, materialization.sinkTable)
  ) {
    return null;
  }

  return {
    runId: snapshot.runId,
    nodeName: data.name,
    rowsWritten: materialization.rowsWritten,
    completedAt: materialization.completedAt,
    durationMs: materialization.durationMs,
    status: 'completed',
  };
}
