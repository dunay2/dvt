/** Revision owner for a single authorized model; never caches rows, credentials or authorization. */
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';

import type { RelationAnalysisCache, RelationAnalysisCacheFailure } from './analysisCache.js';
import { awaitAnalysis } from './analysisCancellation.js';
import { SubstraitAnalysisError, type SubstraitDocument } from './document.js';
import { MemoryRelationAnalysisCache } from './memoryAnalysisCache.js';
import { applyRelationChanges, type RelationChangeSet } from './relationChangeSet.js';
import { RelationSnapshot, type AnalysisWork } from './relationSnapshot.js';
import { decodeSchema, queryRelationSchemas } from './schemaCache.js';
import type { SchemaField } from './schemaTypes.js';

export type RelationAnalysisResult = Readonly<{
  revision: number;
  relationId: string;
  fingerprint: string;
  fields: readonly SchemaField[];
  bindings: readonly DvtSubstraitFieldBindingV1[];
}>;
type SessionOptions = Readonly<{
  document: SubstraitDocument;
  scope: string;
  cache?: RelationAnalysisCache;
  onCacheFailure?: (failure: RelationAnalysisCacheFailure) => void;
}>;

export class RelationAnalysisSession {
  private snapshot: RelationSnapshot | null;
  private generation = 0;
  private lifetime = new globalThis.AbortController();
  private readonly counters: AnalysisWork = { analyzed: 0, fingerprinted: 0, visited: 0 };
  private readonly pending = new Map<string, Promise<string>>();
  private readonly cache: RelationAnalysisCache;
  private failure: RelationAnalysisCacheFailure | null = null;
  private readonly scope: string;
  private readonly reportFailure: SessionOptions['onCacheFailure'];

  constructor(options: SessionOptions) {
    if (options.scope.trim().length === 0) throw new Error('Analysis scope is required.');
    this.scope = options.scope;
    this.reportFailure = options.onCacheFailure;
    this.cache =
      options.cache ??
      new MemoryRelationAnalysisCache({ maxEntries: 512, maxBytes: 4 * 1024 * 1024 });
    this.snapshot = new RelationSnapshot(options.document, this.counters);
  }

  get revision(): number {
    return this.generation;
  }
  get rootId(): string {
    return this.current().rootId;
  }
  get work(): Readonly<AnalysisWork> {
    return { ...this.counters };
  }
  get lastCacheFailure(): RelationAnalysisCacheFailure | null {
    return this.failure;
  }

  private current(): RelationSnapshot {
    if (this.snapshot == null)
      throw new SubstraitAnalysisError('stale_document', 'Analysis session is closed.');
    return this.snapshot;
  }

  private assertRevision(expected: number): void {
    this.current();
    if (expected !== this.generation)
      throw new SubstraitAnalysisError('stale_document', 'Analysis revision changed.');
  }

  /** Locate a command target via inverse edges, without lending mutable canonical messages. */
  locate(relationId: string, expectedRevision: number) {
    this.assertRevision(expectedRevision);
    const snapshot = this.current();
    const selected = snapshot.get(relationId);
    const path: number[] = [];
    let child = selected;
    while (child.consumers.length > 0) {
      const parent = snapshot.get(child.consumers[0]!);
      path.push(parent.inputs.indexOf(child.binding.relationId));
      child = parent;
      snapshot.work.visited += 1;
    }
    return {
      revision: this.generation,
      path: path.reverse(),
      binding: globalThis.structuredClone(selected.binding),
      fields: globalThis.structuredClone(selected.fields),
      inputs: [...selected.inputs],
      consumers: [...selected.consumers],
      nextAnchor: snapshot.nextAnchor,
    };
  }

  async query(
    relationId: string,
    signal?: globalThis.AbortSignal
  ): Promise<RelationAnalysisResult> {
    signal?.throwIfAborted();
    const snapshot = this.current();
    snapshot.get(relationId);
    const revision = this.generation;
    const fingerprint = snapshot.fingerprints.get(relationId)!;
    const pendingKey = JSON.stringify([revision, relationId, fingerprint]);
    let work = this.pending.get(pendingKey);
    if (work == null) {
      work = queryRelationSchemas({
        snapshot,
        relationId,
        scope: this.scope,
        cache: this.cache,
        signal: this.lifetime.signal,
        assertCurrent: () => this.assertRevision(revision),
        onFailure: (failure) => {
          this.failure = failure;
          this.reportFailure?.(failure);
        },
      });
      this.pending.set(pendingKey, work);
      const forget = (): void => {
        if (this.pending.get(pendingKey) === work) this.pending.delete(pendingKey);
      };
      void work.then(forget, forget);
    }
    const serialized = await awaitAnalysis(
      work,
      signal == null
        ? this.lifetime.signal
        : globalThis.AbortSignal.any([signal, this.lifetime.signal])
    );
    signal?.throwIfAborted();
    this.assertRevision(revision);
    const fields = decodeSchema(serialized);
    if (relationId === snapshot.rootId && fields.length !== snapshot.rootNames.length)
      throw new SubstraitAnalysisError(
        'invalid_structure',
        'Root names do not match the derived output width.',
        relationId
      );
    return {
      revision,
      relationId,
      fingerprint,
      fields,
      bindings: globalThis.structuredClone(snapshot.get(relationId).fields),
    };
  }

  apply(change: RelationChangeSet): void {
    this.assertRevision(change.expectedRevision);
    applyRelationChanges(this.current(), change);
    this.advance();
  }

  replace(document: SubstraitDocument, expectedRevision: number): void {
    this.assertRevision(expectedRevision);
    const snapshot = new RelationSnapshot(document, this.counters);
    this.snapshot = snapshot;
    this.advance();
  }

  document(): SubstraitDocument {
    return this.current().export();
  }

  dispose(): void {
    this.snapshot = null;
    this.advance();
  }

  private advance(): void {
    this.lifetime.abort(new SubstraitAnalysisError('stale_document', 'Analysis revision ended.'));
    this.lifetime = new globalThis.AbortController();
    this.generation += 1;
    this.pending.clear();
  }
}
