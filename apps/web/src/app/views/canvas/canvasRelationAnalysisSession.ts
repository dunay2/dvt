/** Bridges existing document boundaries and local command deltas to one owned analysis session. */
import {
  RelationAnalysisSession,
  SubstraitAnalysisError,
  readRelationStructure,
  type RelationAnalysisResult,
  type RelationChangeSet,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import type { ConnectedSourceRef, DvtSubstraitRelationBindingV1 } from '@dvt/contracts';

const connectionKey = (ref: ConnectedSourceRef) =>
  JSON.stringify([
    ref.connectionRef.schemaVersion,
    ref.connectionRef.provider,
    ref.connectionRef.connectionId,
  ]);
const sourceKey = (ref: ConnectedSourceRef) => `${connectionKey(ref)}:${ref.sourceObjectId}`;

export class CanvasRelationAnalysisSession {
  private analysis: RelationAnalysisSession | null = null;
  private accepted: SubstraitDocument | null = null;
  private readonly sourceOccurrences = new Map<string, Set<string>>();
  private readonly sourceConnections = new Map<string, number>();
  private readonly sourceByRelation = new Map<string, ConnectedSourceRef>();

  constructor(private readonly scope: string) {}

  receive(document: SubstraitDocument | null): void {
    if (document === this.accepted) return;
    if (document == null) this.dispose();
    else if (this.analysis == null)
      this.analysis = new RelationAnalysisSession({ document, scope: this.scope });
    else this.analysis.replace(document, this.analysis.revision);
    this.accepted = document;
    this.sourceOccurrences.clear();
    this.sourceConnections.clear();
    this.sourceByRelation.clear();
    for (const binding of document?.sidecar.relations ?? []) this.indexSource(binding);
  }

  private indexSource(binding: DvtSubstraitRelationBindingV1): void {
    const ref = binding.sourceRef;
    if (ref == null) return;
    const occurrences = this.sourceOccurrences.get(sourceKey(ref)) ?? new Set<string>();
    occurrences.add(binding.relationId);
    this.sourceOccurrences.set(sourceKey(ref), occurrences);
    this.sourceConnections.set(
      connectionKey(ref),
      (this.sourceConnections.get(connectionKey(ref)) ?? 0) + 1
    );
    this.sourceByRelation.set(binding.relationId, ref);
  }

  private unindexSource(relationId: string): void {
    const ref = this.sourceByRelation.get(relationId);
    if (ref == null) return;
    const occurrences = this.sourceOccurrences.get(sourceKey(ref));
    occurrences?.delete(relationId);
    if (occurrences?.size === 0) this.sourceOccurrences.delete(sourceKey(ref));
    const count = this.sourceConnections.get(connectionKey(ref))! - 1;
    if (count === 0) this.sourceConnections.delete(connectionKey(ref));
    else this.sourceConnections.set(connectionKey(ref), count);
    this.sourceByRelation.delete(relationId);
  }

  matchingSources(ref: ConnectedSourceRef, expectedRevision: number): readonly string[] {
    this.current().locate(this.rootId, expectedRevision);
    if (this.sourceConnections.size !== 1 || !this.sourceConnections.has(connectionKey(ref)))
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Composition inputs must use the model execution connection.'
      );
    return [...(this.sourceOccurrences.get(sourceKey(ref)) ?? [])];
  }

  private current(): RelationAnalysisSession {
    if (this.analysis == null)
      throw new SubstraitAnalysisError('stale_document', 'No active model analysis.');
    return this.analysis;
  }

  get revision(): number {
    return this.analysis?.revision ?? 0;
  }
  get work(): RelationAnalysisSession['work'] {
    return this.current().work;
  }

  get rootId(): string {
    return this.current().rootId;
  }

  locate(relationId: string, expectedRevision: number) {
    const location = this.current().locate(relationId, expectedRevision);
    const root = this.accepted!.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input == null)
      throw new SubstraitAnalysisError('invalid_structure', 'Canonical root is absent.');
    let relation = root.value.input;
    for (const port of location.path) relation = readRelationStructure(relation).inputs[port]!;
    if (readRelationStructure(relation).common?.relAnchor !== location.binding.relAnchor)
      throw new SubstraitAnalysisError('stale_document', 'Command target and snapshot differ.');
    return { ...location, relation, plan: this.accepted!.plan };
  }

  async query(relationId: string | null, signal?: AbortSignal): Promise<RelationAnalysisResult> {
    const analysis = this.current();
    return analysis.query(relationId ?? analysis.rootId, signal);
  }

  referencingFields(fieldIds: readonly string[], expectedRevision: number) {
    return this.current().referencingFields(fieldIds, expectedRevision);
  }

  apply(change: RelationChangeSet): SubstraitDocument {
    const analysis = this.current();
    analysis.apply(change);
    for (const id of [
      ...change.removed,
      ...change.upserts.map((entry) => entry.binding.relationId),
    ])
      this.unindexSource(id);
    for (const entry of change.upserts) this.indexSource(entry.binding);
    // Existing draft/Apply boundary: explicitly materialize and hash the canonical document here.
    this.accepted = analysis.document();
    return this.accepted;
  }

  dispose(): void {
    this.analysis?.dispose();
    this.analysis = null;
    this.accepted = null;
    this.sourceOccurrences.clear();
    this.sourceConnections.clear();
    this.sourceByRelation.clear();
  }
}
