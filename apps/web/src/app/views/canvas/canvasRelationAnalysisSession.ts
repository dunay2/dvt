/**
 * Owned concern: bridge document boundaries and commands to one revisioned analysis session.
 * @baseline GH-3596 / GH-3578: retained edits use canonical snapshots, not acknowledgement objects.
 * @decision Receive updates eligibility; restoring a rejected document preserves the current facts.
 * @consequence Equivalent ACKs preserve operand identity and rollback cannot relax output guards.
 * @version 1.3.0
 */
import {
  RelationAnalysisSession,
  SubstraitAnalysisError,
  readRelationStructure,
  type RelationAnalysisResult,
  type RelationChangeSet,
  type SubstraitDocument,
  type SchemaField,
} from '@dvt/substrait-analysis';
import type { ConnectedSourceRef, ConnectionRef } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { equals } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { sourceOccurrenceAliases } from './relational-source-occurrence/sourceOccurrenceAlias';
import { CanvasRelationSources } from './canvasRelationSources';
import {
  canvasInputSchemaIsEligible,
  canvasRetainedOutputSchemaIsEligible,
} from './canvasInputFieldEligibility';

export class CanvasRelationAnalysisSession {
  private analysis: RelationAnalysisSession | null = null;
  private accepted: SubstraitDocument | null = null;
  private readonly sources: CanvasRelationSources;
  private deniedInputs: ReadonlySet<string> = new Set();
  private disconnectedInputs: ReadonlySet<string> = new Set();

  constructor(
    private readonly scope: string,
    private readonly connection?: ConnectionRef
  ) {
    this.sources = new CanvasRelationSources(connection);
  }

  receive(
    document: SubstraitDocument | null,
    deniedInputs: ReadonlySet<string> = new Set(),
    disconnectedInputs: ReadonlySet<string> = new Set()
  ): void {
    this.deniedInputs = deniedInputs;
    this.disconnectedInputs = disconnectedInputs;
    // Full-document acknowledgements can allocate new objects without changing authority.
    // Local edits retain the identity fast path and the existing incremental change rail.
    if (this.hasDocument(document)) return;
    if (document == null) this.dispose();
    else if (this.analysis == null)
      this.analysis = new RelationAnalysisSession({ document, scope: this.scope });
    else this.analysis.replace(document, this.analysis.revision);
    this.accepted = document;
    this.reindexSources(document);
  }

  restoreDocument(document: SubstraitDocument): void {
    this.receive(document, this.deniedInputs, this.disconnectedInputs);
  }

  hasDocument(document: SubstraitDocument | null): boolean {
    return (
      document === this.accepted ||
      (document != null &&
        this.accepted != null &&
        equals(PlanSchema, document.plan, this.accepted.plan) &&
        jcsCanonicalize(document.sidecar) === jcsCanonicalize(this.accepted.sidecar))
    );
  }

  private reindexSources(document: SubstraitDocument | null): void {
    this.sources.clear();
    for (const binding of document?.sidecar.relations ?? []) this.sources.add(binding);
  }

  matchingSources(ref: ConnectedSourceRef, expectedRevision: number): readonly string[] {
    this.current().locate(this.rootId, expectedRevision);
    return this.sources.matching(ref);
  }

  matchingProducer(
    nodeId: string,
    connection: ConnectionRef,
    expectedRevision: number
  ): readonly string[] {
    this.current().locate(this.rootId, expectedRevision);
    return this.sources.matchingProducer(nodeId, connection);
  }

  sourceAliases(expectedRevision: number, exceptRelationId?: string): ReadonlySet<string> {
    this.current().locate(this.rootId, expectedRevision);
    return sourceOccurrenceAliases(this.accepted!.sidecar.relations, exceptRelationId);
  }

  executionProvider(expectedRevision: number): string {
    this.current().locate(this.rootId, expectedRevision);
    return this.sources.executionConnection().provider;
  }

  private current(): RelationAnalysisSession {
    if (this.analysis == null)
      throw new SubstraitAnalysisError('stale_document', 'No active model analysis.');
    return this.analysis;
  }

  get revision(): number {
    return this.analysis?.revision ?? 0;
  }
  allowsInputSchema(field: SchemaField): boolean {
    return canvasInputSchemaIsEligible(field, this.deniedInputs);
  }
  canEditRetainedJoinOutput(relationId: string): boolean {
    return (
      this.disconnectedInputs.size > 0 &&
      relationId === this.rootId &&
      this.locate(relationId, this.revision).relation.relType.case === 'join'
    );
  }
  allowsOutputSchema(relationId: string, field: SchemaField): boolean {
    return this.canEditRetainedJoinOutput(relationId)
      ? canvasRetainedOutputSchemaIsEligible(field, this.deniedInputs, this.disconnectedInputs)
      : this.allowsInputSchema(field);
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
      this.sources.remove(id);
    for (const entry of change.upserts) this.sources.add(entry.binding);
    // Existing draft/Apply boundary: explicitly materialize and hash the canonical document here.
    this.accepted = analysis.document();
    return this.accepted;
  }

  async transact(
    expectedRevision: number,
    work: (staged: CanvasRelationAnalysisSession) => Promise<void>,
    signal?: AbortSignal
  ): Promise<SubstraitDocument> {
    signal?.throwIfAborted();
    this.locate(this.rootId, expectedRevision);
    const staged = new CanvasRelationAnalysisSession(`${this.scope}:staged`, this.connection);
    staged.receive(this.current().document(), this.deniedInputs, this.disconnectedInputs);
    try {
      await work(staged);
      signal?.throwIfAborted();
      const document = staged.current().document();
      this.current().replace(document, expectedRevision);
      this.accepted = this.current().document();
      this.reindexSources(this.accepted);
      return this.accepted;
    } finally {
      staged.dispose();
    }
  }

  dispose(): void {
    this.analysis?.dispose();
    this.analysis = null;
    this.accepted = null;
    this.sources.clear();
  }
}
