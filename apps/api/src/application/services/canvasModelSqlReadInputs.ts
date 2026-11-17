/** Bind saved Read occurrences by canonical provenance; aliases are SQL syntax only. */
import { jcsCanonicalize } from '@dvt/crypto';
import {
  deriveSubstraitSchemas,
  resolveProducerInput,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import {
  CanvasModelSqlUnavailableError,
  type ModelSqlPublishedInput,
} from '../ports/canvasModelSql.js';

export function bindModelSqlReadInputs(
  publications: readonly ModelSqlPublishedInput[],
  documents: readonly SubstraitDocument[]
): ModelSqlPublishedInput[] {
  const result: ModelSqlPublishedInput[] = [];
  const retained = new Set<string>();
  for (const document of documents) {
    const { index } = deriveSubstraitSchemas(document);
    for (const entry of index.relations.values()) {
      if (entry.relation.relType.case !== 'read' || retained.has(entry.binding.relationId))
        continue;
      const matching = publications.filter(({ input }) =>
        entry.binding.producerRef != null
          ? input.nodeId === entry.binding.producerRef.nodeId
          : 'sourceRef' in input.source &&
            jcsCanonicalize(input.source.sourceRef) ===
              jcsCanonicalize(entry.binding.sourceRef ?? null)
      );
      if (matching.length !== 1) throw new CanvasModelSqlUnavailableError('input_unavailable');
      const publication = matching[0]!;
      if ('producer' in publication.input.source)
        resolveProducerInput(entry, publication.input.source.producer.document);
      const read = entry.relation.relType.value;
      if (
        'sourceRef' in publication.input.source &&
        (read.readType.case !== 'namedTable' ||
          jcsCanonicalize(read.readType.value.names) !==
            jcsCanonicalize(publication.input.source.names))
      )
        throw new CanvasModelSqlUnavailableError('input_unavailable');
      const names = read.baseSchema?.names ?? [];
      const types = read.baseSchema?.struct?.types ?? [];
      const fields = entry.fields
        .filter((field) => field.parentFieldId == null)
        .sort((a, b) => a.outputOrdinal - b.outputOrdinal);
      const columns = fields.flatMap((field, ordinal) => {
        const id =
          entry.binding.producerRef?.fields.find((mapping) => mapping.fieldId === field.fieldId)
            ?.producerFieldId ?? field.displayName;
        const physicalFacts =
          'sourceRef' in publication.input.source ? publication.input.source.columns : undefined;
        const facts = physicalFacts ?? publication.input.columns;
        const current = facts.find((candidate) => candidate.id === id);
        if (
          current == null ||
          current.name !== names[ordinal] ||
          types[ordinal] == null ||
          jcsCanonicalize(current.type) !== jcsCanonicalize(types[ordinal]!)
        )
          throw new CanvasModelSqlUnavailableError('input_unavailable');
        const column = publication.input.columns.find((candidate) => candidate.id === id);
        return column == null ? [] : [column];
      });
      if (
        columns.length === 0 ||
        names.length !== fields.length ||
        entry.fields.length !== fields.length
      )
        throw new CanvasModelSqlUnavailableError('input_unavailable');
      retained.add(entry.binding.relationId);
      result.push({
        ...publication,
        input: {
          ...publication.input,
          sqlName: entry.binding.displayName ?? publication.name,
          columns,
          retainedRead: entry,
        },
        columns: columns.map((column) =>
          publication.columns.find((candidate) => candidate.id === column.id)!
        ),
      });
    }
  }
  for (const publication of publications) {
    if (
      !result.some(
        (item) =>
          item.input.nodeId === publication.input.nodeId &&
          jcsCanonicalize(item.columns) === jcsCanonicalize(publication.columns)
      )
    )
      result.push(publication);
  }
  const names = new Set<string>();
  return result.map((publication) => {
    const base = publication.input.sqlName;
    let name = base;
    let ordinal = 2;
    while (names.has(name)) name = `${base}_${ordinal++}`;
    names.add(name);
    return { ...publication, input: { ...publication.input, sqlName: name } };
  });
}
