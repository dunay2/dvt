/** Copy only the local protobuf message; inputs remain canonical messages, not a new algebra. */
import { RelSchema, type Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { clone, create } from '@bufbuild/protobuf';

import { readRelationStructure } from './relationStructure.js';

export function withRelationInputs(relation: Rel, inputs: readonly Rel[]): Rel {
  const previous = readRelationStructure(relation).inputs;
  if (previous.length !== inputs.length) throw new Error('Relation input arity differs.');
  const replacements = new Map(previous.map((input, index) => [input, inputs[index]!]));
  const variant = relation.relType;
  if (variant.case == null) throw new Error('Relation variant is absent.');
  const value = Object.fromEntries(
    Object.entries(variant.value).map(([key, member]) => [
      key,
      Array.isArray(member)
        ? member.map((item: unknown) => replacements.get(item as Rel) ?? item)
        : (replacements.get(member as Rel) ?? member),
    ])
  );
  return { ...relation, relType: { case: variant.case, value } } as Rel;
}

export function cloneLocalRelation(relation: Rel, inputs: readonly Rel[]): Rel {
  const blanks = readRelationStructure(relation).inputs.map(() => create(RelSchema));
  return withRelationInputs(clone(RelSchema, withRelationInputs(relation, blanks)), inputs);
}

export function localRelation(relation: Rel): Rel {
  return withRelationInputs(
    relation,
    readRelationStructure(relation).inputs.map(() => create(RelSchema))
  );
}
