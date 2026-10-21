/**
 * Project persisted publication evidence only onto its exact configured Sink.
 * @baseline GH-3115: relation-only materialization cannot establish node ownership.
 * @decision Match immutable publication node ID and the contract-validated physical target.
 * @consequence No legacy/name fallback, destination query or cross-card metric attribution.
 * @version 2.0.0
 */
import { DvtPostgresRelationTargetV1Schema } from '@dvt/contracts';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { RunSnapshot } from '../../ports/runs';
import { isRecord } from '../../types/canonicalGuards';

export type CanvasSinkRunEvidence = Readonly<{
  runId: string;
  nodeName: string;
  rowsWritten: number;
  completedAt: string;
  durationMs: number;
  status: 'completed';
}>;

export function resolveCanvasSinkRunEvidence(
  nodeId: string,
  data: DbtNodeData,
  snapshot: RunSnapshot | null | undefined
): CanvasSinkRunEvidence | null {
  const evidence = snapshot?.publication;
  const config = data.metadata?.config;
  if (
    data.role !== 'output' ||
    data.pluginKind !== 'dvt:sink' ||
    snapshot?.status !== 'completed' ||
    evidence?.publication.nodeId !== nodeId ||
    !isRecord(config)
  )
    return null;

  const target = DvtPostgresRelationTargetV1Schema.safeParse({
    connectionRef: config.connectionRef,
    schema: config.schema,
    relation: config.table,
  });
  if (
    !target.success ||
    target.data.connectionRef.connectionId !== evidence.target.connectionRef.connectionId ||
    target.data.schema !== evidence.target.schema ||
    target.data.relation !== evidence.target.relation
  )
    return null;

  return {
    runId: snapshot.runId,
    nodeName: data.name,
    rowsWritten: evidence.rowsWritten,
    completedAt: evidence.completedAt,
    durationMs: evidence.durationMs,
    status: 'completed',
  };
}
