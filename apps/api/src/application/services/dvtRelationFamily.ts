/** Classifies the admitted terminal relation family; never infers it from physical source count. */
import type { decodeDvtSubstraitPlanV1 } from '@dvt/contracts';

type CanonicalSemanticRelation = NonNullable<
  Extract<
    ReturnType<typeof decodeDvtSubstraitPlanV1>['relations'][number]['relType'],
    { case: 'root' }
  >['value']['input']
>;

export function containsSetRelation(relation: CanonicalSemanticRelation): boolean {
  switch (relation.relType.case) {
    case 'set':
      return true;
    case 'project':
    case 'filter':
    case 'aggregate':
    case 'sort':
    case 'fetch':
      return relation.relType.value.input == null
        ? false
        : containsSetRelation(relation.relType.value.input);
    case 'join':
    case 'cross':
      return (
        (relation.relType.value.left != null && containsSetRelation(relation.relType.value.left)) ||
        (relation.relType.value.right != null && containsSetRelation(relation.relType.value.right))
      );
    default:
      return false;
  }
}

export function containsJoinRelation(relation: CanonicalSemanticRelation): boolean {
  switch (relation.relType.case) {
    case 'join':
    case 'cross':
      return true;
    case 'project':
    case 'filter':
    case 'aggregate':
    case 'sort':
    case 'fetch':
      return relation.relType.value.input == null
        ? false
        : containsJoinRelation(relation.relType.value.input);
    case 'set':
      return relation.relType.value.inputs.some(containsJoinRelation);
    default:
      return false;
  }
}
