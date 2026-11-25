/** Bind saved Read occurrences by canonical provenance; aliases are SQL syntax only. */
import { isDvtSubstraitLiteralRowPlanV1 } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import {
  deriveSubstraitSchemas,
  resolveProducerInput,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import {
  CanvasModelSqlUnavailableError,
  type ModelSqlPublishedInput,
} from '../ports/canvasModelSql.js';

type ReadRelation = Extract<IndexedRelation['relation']['relType'], { case: 'read' }>['value'];

function matchingReadPublication(
  publications: readonly ModelSqlPublishedInput[],
  entry: IndexedRelation
): ModelSqlPublishedInput {
  const matching = publications.filter(({ input }) =>
    entry.binding.producerRef != null
      ? input.nodeId === entry.binding.producerRef.nodeId
      : 'sourceRef' in input.source &&
        jcsCanonicalize(input.source.sourceRef) === jcsCanonicalize(entry.binding.sourceRef ?? null)
  );
  if (matching.length !== 1) throw new CanvasModelSqlUnavailableError('input_unavailable');
  return matching[0]!;
}

function bindPublishedReadField(
  publication: ModelSqlPublishedInput,
  occurrence: Readonly<{ binding: IndexedRelation['binding']; read: ReadRelation }>,
  field: IndexedRelation['fields'][number],
  ordinal: number
): ModelSqlPublishedInput['input']['columns'][number] | undefined {
  const id =
    occurrence.binding.producerRef?.fields.find((mapping) => mapping.fieldId === field.fieldId)
      ?.producerFieldId ?? field.displayName;
  const physicalFacts =
    'sourceRef' in publication.input.source ? publication.input.source.columns : undefined;
  const current = (physicalFacts ?? publication.input.columns).find(
    (candidate) => candidate.id === id
  );
  const expectedType = (occurrence.read.baseSchema?.struct?.types ?? [])[ordinal];
  const expectedName = (occurrence.read.baseSchema?.names ?? [])[ordinal];
  if (current == null || expectedType == null)
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  if (
    current.name !== expectedName ||
    jcsCanonicalize(current.type) !== jcsCanonicalize(expectedType)
  )
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  return publication.input.columns.find((candidate) => candidate.id === id);
}

function readPublicationColumns(
  publication: ModelSqlPublishedInput,
  entry: IndexedRelation,
  read: ReadRelation
): ModelSqlPublishedInput['input']['columns'] {
  const fields = entry.fields
    .filter((field) => field.parentFieldId == null)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal);
  const occurrence = { binding: entry.binding, read };
  const columns = fields.flatMap((field, ordinal) => {
    const column = bindPublishedReadField(publication, occurrence, field, ordinal);
    return column == null ? [] : [column];
  });
  if (columns.length === 0) throw new CanvasModelSqlUnavailableError('input_unavailable');
  if (
    (read.baseSchema?.names ?? []).length !== fields.length ||
    entry.fields.length !== fields.length
  )
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  return columns;
}

function admitPhysicalRead(publication: ModelSqlPublishedInput, read: ReadRelation): void {
  if (!('sourceRef' in publication.input.source)) return;
  if (read.readType.case !== 'namedTable')
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  if (
    jcsCanonicalize(read.readType.value.names) !== jcsCanonicalize(publication.input.source.names)
  )
    throw new CanvasModelSqlUnavailableError('input_unavailable');
}

function admittedReadForPublication(
  publication: ModelSqlPublishedInput,
  entry: IndexedRelation
): ReadRelation {
  if ('producer' in publication.input.source)
    resolveProducerInput(entry, publication.input.source.producer.document);
  if (entry.relation.relType.case !== 'read')
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  const read = entry.relation.relType.value;
  admitPhysicalRead(publication, read);
  return read;
}

function bindReadOccurrence(
  publications: readonly ModelSqlPublishedInput[],
  entry: IndexedRelation
): ModelSqlPublishedInput {
  const publication = matchingReadPublication(publications, entry);
  const read = admittedReadForPublication(publication, entry);
  const columns = readPublicationColumns(publication, entry, read);
  return {
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
  };
}

function bindDocumentReads(
  document: SubstraitDocument,
  publications: readonly ModelSqlPublishedInput[],
  state: Readonly<{ retained: Set<string>; result: ModelSqlPublishedInput[] }>
): void {
  if (isDvtSubstraitLiteralRowPlanV1(document.plan, document.sidecar)) return;
  const { index } = deriveSubstraitSchemas(document);
  for (const entry of index.relations.values()) {
    if (entry.relation.relType.case !== 'read' || state.retained.has(entry.binding.relationId))
      continue;
    const publication = bindReadOccurrence(publications, entry);
    state.retained.add(entry.binding.relationId);
    state.result.push(publication);
  }
}

function appendRemainingPublications(
  result: ModelSqlPublishedInput[],
  publications: readonly ModelSqlPublishedInput[]
): void {
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
}

function uniqueSqlInputNames(
  publications: readonly ModelSqlPublishedInput[]
): ModelSqlPublishedInput[] {
  const names = new Set<string>();
  return publications.map((publication) => {
    const base = publication.input.sqlName;
    let name = base;
    let ordinal = 2;
    while (names.has(name)) name = `${base}_${ordinal++}`;
    names.add(name);
    return { ...publication, input: { ...publication.input, sqlName: name } };
  });
}

export function bindModelSqlReadInputs(
  publications: readonly ModelSqlPublishedInput[],
  documents: readonly SubstraitDocument[]
): ModelSqlPublishedInput[] {
  const result: ModelSqlPublishedInput[] = [];
  const retained = new Set<string>();
  const state = { result, retained };
  for (const document of documents) bindDocumentReads(document, publications, state);
  appendRemainingPublications(result, publications);
  return uniqueSqlInputNames(result);
}
