/** Classifies the admitted terminal relation family; never infers it from physical source count. */
import type { decodeDvtSubstraitPlanV1 } from '@dvt/contracts';

type CanonicalSemanticRelation = NonNullable<
  Extract<
    ReturnType<typeof decodeDvtSubstraitPlanV1>['relations'][number]['relType'],
    { case: 'root' }
  >['value']['input']
>;

function isDvtUnaryRelation(
  relation: CanonicalSemanticRelation['relType']
): relation is Extract<
  CanonicalSemanticRelation['relType'],
  { case: 'project' | 'filter' | 'aggregate' | 'sort' | 'fetch' }
> {
  return (
    relation.case === 'project' ||
    relation.case === 'filter' ||
    relation.case === 'aggregate' ||
    relation.case === 'sort' ||
    relation.case === 'fetch'
  );
}

function dvtRelationInputs(
  relation: Readonly<{
    input?: CanonicalSemanticRelation | undefined;
    left?: CanonicalSemanticRelation | undefined;
    right?: CanonicalSemanticRelation | undefined;
  }>
): CanonicalSemanticRelation[] {
  return [relation.input, relation.left, relation.right].filter(
    (input): input is CanonicalSemanticRelation => input != null
  );
}

export function classifyDvtRelationFamily(
  documents: Iterable<Readonly<{ plan: ReturnType<typeof decodeDvtSubstraitPlanV1> }>>
): Readonly<{ hasJoin: boolean; hasSet: boolean }> {
  const roots = [...documents].flatMap(({ plan }) => {
    const root = plan.relations[0]?.relType;
    return root?.case === 'root' && root.value.input != null ? [root.value.input] : [];
  });
  return { hasJoin: roots.some(containsJoinRelation), hasSet: roots.some(containsSetRelation) };
}

export function containsSetRelation(relation: CanonicalSemanticRelation): boolean {
  if (isDvtUnaryRelation(relation.relType))
    return dvtRelationInputs(relation.relType.value).some(containsSetRelation);
  switch (relation.relType.case) {
    case 'set':
      return true;
    case 'join':
    case 'cross':
      return dvtRelationInputs(relation.relType.value).some(containsSetRelation);
    default:
      return false;
  }
}

export function containsJoinRelation(relation: CanonicalSemanticRelation): boolean {
  if (isDvtUnaryRelation(relation.relType))
    return dvtRelationInputs(relation.relType.value).some(containsJoinRelation);
  switch (relation.relType.case) {
    case 'join':
    case 'cross':
      return true;
    case 'set':
      return relation.relType.value.inputs.some(containsJoinRelation);
    default:
      return false;
  }
}
