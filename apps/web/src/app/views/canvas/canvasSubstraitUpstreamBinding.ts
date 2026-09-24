/** Match an embedded canonical input to the connected producer's current authority. */
import { toBinary } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { jcsCanonicalize, sha256Hex } from '@dvt/crypto';
import type { SubstraitDocument, SubstraitRelationIndex } from '@dvt/substrait-analysis';

export type IndexedCanvasDocument = Readonly<{
  document: SubstraitDocument;
  index: SubstraitRelationIndex;
}>;

export function matchesCanvasSubstraitUpstream(
  consumer: IndexedCanvasDocument,
  producer: IndexedCanvasDocument
): boolean {
  const embedded = consumer.index.relations.get(producer.index.rootId);
  const root = producer.index.relations.get(producer.index.rootId)!;
  if (
    embedded == null ||
    sha256Hex(toBinary(RelSchema, embedded.relation)) !==
      sha256Hex(toBinary(RelSchema, root.relation))
  )
    return false;
  for (const [id, entry] of producer.index.relations) {
    const candidate = consumer.index.relations.get(id);
    if (
      candidate == null ||
      jcsCanonicalize(candidate.binding) !== jcsCanonicalize(entry.binding) ||
      jcsCanonicalize(candidate.fields) !== jcsCanonicalize(entry.fields)
    )
      return false;
  }
  const declarations = new Set(consumer.document.plan.extensions.map(jcsCanonicalize));
  const urns = new Set(consumer.document.plan.extensionUrns.map(jcsCanonicalize));
  return (
    producer.document.plan.extensions.every((entry) => declarations.has(jcsCanonicalize(entry))) &&
    producer.document.plan.extensionUrns.every((entry) => urns.has(jcsCanonicalize(entry)))
  );
}
