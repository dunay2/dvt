/**
 * Owned concern: derive display metadata from already indexed canonical relation shapes.
 * @baseline ADR-0064 / ADR-0069: canonical operators and bound Reads own presentation facts.
 * @decision Keep operator admission, physical labels and SORT/FETCH summaries outside tree traversal.
 * @consequence Aliases do not invent sources and unsupported operators retain their existing rejection.
 * @version 1.0.0
 */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { IndexedRelation, SubstraitRelationIndex } from '@dvt/substrait-analysis';
import { dvtSubstraitExpressionReader } from '@dvt/postgres-projection';
import { sortDirectionLabel } from './semanticWorkbenchRelationMetadata';
import { relationAnchor, isAdmittedSort, isAdmittedFetch } from './canvasRelationalTraversal';
import type {
  CanvasRelationalTreeNode,
  CanvasRelationalTreeOperator,
} from './canvasRelationalTreeProjection';

export function physicalReadPresentation(
  entry: IndexedRelation
): Pick<CanvasRelationalTreeNode, 'physicalSource'> {
  if (entry.binding.sourceRef == null || entry.relation.relType.case !== 'read') return {};
  const read = entry.relation.relType.value.readType;
  if (read.case !== 'namedTable') return {};
  const name = read.value.names.at(-1);
  if (name == null) return {};
  const qualifiedName = read.value.names
    .map((part) => (/^[a-z_][a-z0-9_]*$/.test(part) ? part : `"${part.replace(/"/g, '""')}"`))
    .join('.');
  return { physicalSource: { name, qualifiedName } };
}

const BASIC_OPERATORS: ReadonlyMap<Rel['relType']['case'], CanvasRelationalTreeOperator> = new Map([
  ['read', 'read'],
  ['project', 'project'],
  ['filter', 'filter'],
  ['join', 'join'],
  ['cross', 'cross'],
  ['set', 'set'],
  ['aggregate', 'aggregate'],
]);

export function operator(rel: Rel): CanvasRelationalTreeOperator {
  const basic = BASIC_OPERATORS.get(rel.relType.case);
  if (basic != null) return basic;
  switch (rel.relType.case) {
    case 'sort':
      return isAdmittedSort(rel) ? 'sort' : 'unsupported';
    case 'fetch':
      return isAdmittedFetch(rel) ? 'fetch' : 'unsupported';
    default:
      return 'unsupported';
  }
}

type FetchRelation = Extract<Rel['relType'], { case: 'fetch' }>['value'];
type SortRelation = Extract<Rel['relType'], { case: 'sort' }>['value'];

function literalLimit(expression: FetchRelation['countExpr']): bigint | null {
  const value = expression == null ? null : dvtSubstraitExpressionReader.literalValue(expression);
  return value?.dataType === 'i64' ? value.value : null;
}

function fetchSummary(fetch: FetchRelation): string {
  return `LIMIT ${literalLimit(fetch.countExpr)?.toString() ?? 'ALL'} · OFFSET ${literalLimit(fetch.offsetExpr)?.toString() ?? '0'}`;
}

function sortFieldSummary(
  field: SortRelation['sorts'][number],
  inputs: IndexedRelation['fields']
): string | null {
  const ordinal = dvtSubstraitExpressionReader.fieldOrdinal(field.expr);
  const name = ordinal == null ? null : inputs[ordinal]?.displayName;
  const value = field.sortKind.case === 'direction' ? sortDirectionLabel(field.sortKind.value) : '';
  return name == null || value.length === 0 ? null : `${name} ${value}`;
}

function sortSummary(sort: SortRelation, index: SubstraitRelationIndex): string | null {
  if (sort.input == null) return null;
  const inputAnchor = relationAnchor(sort.input);
  const inputRelation = inputAnchor == null ? undefined : index.byAnchor.get(inputAnchor);
  const inputFields =
    (inputRelation == null ? undefined : index.relations.get(inputRelation)?.fields) ?? [];
  return sort.sorts
    .map((field) => sortFieldSummary(field, inputFields))
    .filter((value): value is string => value != null)
    .join(' · ');
}

export function sortFetchSummary(rel: Rel, index: SubstraitRelationIndex): string | null {
  if (rel.relType.case === 'fetch') return fetchSummary(rel.relType.value);
  return rel.relType.case === 'sort' ? sortSummary(rel.relType.value, index) : null;
}
