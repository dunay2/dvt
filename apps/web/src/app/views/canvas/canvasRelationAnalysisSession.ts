/** Bridges existing document boundaries and local command deltas to one owned analysis session. */
import {
  RelationAnalysisSession,
  SubstraitAnalysisError,
  readRelationStructure,
  type RelationAnalysisResult,
  type RelationChangeSet,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

export class CanvasRelationAnalysisSession {
  private analysis: RelationAnalysisSession | null = null;
  private accepted: SubstraitDocument | null = null;

  constructor(private readonly scope: string) {}

  receive(document: SubstraitDocument | null): void {
    if (document === this.accepted) return;
    if (document == null) this.dispose();
    else if (this.analysis == null)
      this.analysis = new RelationAnalysisSession({ document, scope: this.scope });
    else this.analysis.replace(document, this.analysis.revision);
    this.accepted = document;
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
    // Existing draft/Apply boundary: explicitly materialize and hash the canonical document here.
    this.accepted = analysis.document();
    return this.accepted;
  }

  dispose(): void {
    this.analysis?.dispose();
    this.analysis = null;
    this.accepted = null;
  }
}
