/** Source identity index and resolved execution context for one authoring session. */
import type {
  ConnectedSourceRef,
  ConnectionRef,
  DvtSubstraitRelationBindingV1,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';

export class CanvasRelationSources {
  private readonly sources = new Map<string, ConnectedSourceRef>();
  private readonly producers = new Map<string, string>();
  constructor(private readonly connection?: ConnectionRef) {}
  clear(): void {
    this.sources.clear();
    this.producers.clear();
  }
  add(binding: DvtSubstraitRelationBindingV1): void {
    if (binding.sourceRef != null) this.sources.set(binding.relationId, binding.sourceRef);
    if (binding.producerRef != null)
      this.producers.set(binding.relationId, binding.producerRef.nodeId);
  }
  remove(relationId: string): void {
    this.sources.delete(relationId);
    this.producers.delete(relationId);
  }
  executionConnection(): ConnectionRef {
    const refs = [...this.sources.values()].map((ref) => ref.connectionRef);
    const connection = this.connection ?? refs[0];
    if (
      connection == null ||
      refs.some((ref) => jcsCanonicalize(ref) !== jcsCanonicalize(connection))
    )
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Composition inputs must use one model execution connection.'
      );
    return connection;
  }
  matching(ref: ConnectedSourceRef): readonly string[] {
    if (jcsCanonicalize(this.executionConnection()) !== jcsCanonicalize(ref.connectionRef))
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Composition inputs must use the model execution connection.'
      );
    return [...this.sources].flatMap(([id, source]) =>
      jcsCanonicalize(source) === jcsCanonicalize(ref) ? [id] : []
    );
  }
  matchingProducer(nodeId: string, connection: ConnectionRef): readonly string[] {
    if (jcsCanonicalize(this.executionConnection()) !== jcsCanonicalize(connection))
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Composition inputs must use the model execution connection.'
      );
    return [...this.producers].flatMap(([id, producer]) => (producer === nodeId ? [id] : []));
  }
}
