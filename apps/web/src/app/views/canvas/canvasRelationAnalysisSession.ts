/** Bridges existing document boundaries and local command deltas to one owned analysis session. */
import {
  RelationAnalysisSession,
  SubstraitAnalysisError,
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

  async query(relationId: string | null, signal?: AbortSignal): Promise<RelationAnalysisResult> {
    const analysis = this.current();
    return analysis.query(relationId ?? analysis.rootId, signal);
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
