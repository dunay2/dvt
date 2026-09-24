/** Owns asynchronous schema sessions for one Canvas consumer lifetime, never provider data. */
import {
  RelationAnalysisSession,
  MemoryRelationAnalysisCache,
  type RelationAnalysisCache,
  indexSubstraitRelations,
  type RelationAnalysisResult,
  type SubstraitDocument,
  type SubstraitRelationIndex,
} from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

export type CanvasPresentationAnalysisEntry = Readonly<{
  document: SubstraitDocument;
  index: SubstraitRelationIndex;
  session: RelationAnalysisSession;
}>;

export class CanvasPresentationAnalysis {
  constructor(
    private readonly cache: RelationAnalysisCache = new MemoryRelationAnalysisCache({
      maxEntries: 512,
      maxBytes: 4 * 1024 * 1024,
    })
  ) {}
  private readonly entries = new Map<
    string,
    {
      authority: unknown;
      value: CanvasPresentationAnalysisEntry | null;
    }
  >();

  receive(node: CanonicalNode): CanvasPresentationAnalysisEntry | null {
    const authority = node.metadata?.transformAuthoring;
    const previous = this.entries.get(node.id);
    if (previous != null && previous.authority === authority) return previous.value;
    previous?.value?.session.dispose();
    this.entries.delete(node.id);
    const semantic = readDvtTransformAuthoringAuthority(node);
    if (semantic == null) {
      this.entries.set(node.id, { authority, value: null });
      return null;
    }
    const document = decodeDvtSubstraitSemanticDocument(semantic.semanticDocument);
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    const session = new RelationAnalysisSession({ document, scope: node.id, cache: this.cache });
    const value = { document, index: indexed.index, session };
    this.entries.set(node.id, { authority, value });
    return value;
  }

  async query(
    node: CanonicalNode,
    signal?: AbortSignal
  ): Promise<
    (CanvasPresentationAnalysisEntry & Readonly<{ result: RelationAnalysisResult }>) | null
  > {
    const entry = this.receive(node);
    if (entry == null) return null;
    const result = await entry.session.query(entry.session.rootId, signal);
    return { ...entry, result };
  }

  retain(nodeIds: ReadonlySet<string>): void {
    for (const [id, entry] of this.entries) {
      if (nodeIds.has(id)) continue;
      entry.value?.session.dispose();
      this.entries.delete(id);
    }
  }

  dispose(): void {
    this.retain(new Set());
  }
}
