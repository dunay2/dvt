/** Structural arity only; recognizing a relation does not admit its semantics or provider. */
import type { Rel, RelCommon } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { SubstraitAnalysisError } from './document.js';

type Variant = Exclude<Rel['relType'], { case: undefined }>;
type InputReaders = {
  [K in Variant['case']]?: (message: Extract<Variant, { case: K }>['value']) => readonly Rel[];
};

function requireInput(input: Rel | undefined): Rel {
  if (input == null)
    throw new SubstraitAnalysisError('invalid_structure', 'A relation input is absent.');
  return input;
}
const unary = (message: { input?: Rel | undefined }): readonly Rel[] => [
  requireInput(message.input),
];
const binary = (message: { left?: Rel | undefined; right?: Rel | undefined }): readonly Rel[] => [
  requireInput(message.left),
  requireInput(message.right),
];

const inputReaders = {
  read: () => [],
  project: unary,
  filter: unary,
  aggregate: unary,
  sort: unary,
  fetch: unary,
  join: binary,
  cross: binary,
  set: (message) => {
    if (message.inputs.length === 0)
      throw new SubstraitAnalysisError('invalid_structure', 'A set relation has no inputs.');
    return message.inputs;
  },
} satisfies InputReaders;

export function readRelationStructure(
  rel: Rel
): Readonly<{ common: RelCommon | undefined; inputs: readonly Rel[] }> {
  const variant = rel.relType;
  if (variant.case === undefined || !Object.hasOwn(inputReaders, variant.case)) {
    throw new SubstraitAnalysisError(
      'unsupported_relation',
      `Unsupported relation: ${variant.case ?? 'unset'}.`
    );
  }
  // The protobuf discriminant and mapped registry tie this message to its handler.
  const reader = inputReaders[variant.case as keyof typeof inputReaders] as (
    message: Variant['value']
  ) => readonly Rel[];
  return {
    common: 'common' in variant.value ? variant.value.common : undefined,
    inputs: reader(variant.value),
  };
}
