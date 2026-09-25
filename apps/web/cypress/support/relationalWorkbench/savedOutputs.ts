/** Read persisted fields and unchanged operand/predicate identities from Substrait, not a SQL profile. */
import type { JoinRel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  deriveSubstraitSchemas,
  type SubstraitDocument,
  type IndexedRelation,
} from '@dvt/substrait-analysis';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';

import { semanticDocumentFromWrite, semanticWrites } from './persistence';

export function savedOutputs(): {
  document: SubstraitDocument;
  outputs: IndexedRelation['fields'];
  operands: IndexedRelation[];
  predicates: {
    id: string;
    inputs: readonly string[];
    type: JoinRel['type'];
    expression: JoinRel['expression'];
  }[];
} {
  const write = semanticWrites('join-transform').at(-1);
  expect(write, 'applied canonical document').not.to.equal(undefined);
  const document = decodeDvtSubstraitSemanticDocument(semanticDocumentFromWrite(write!));
  const { index, schemas } = deriveSubstraitSchemas(document);
  const root = index.relations.get(index.rootId)!;
  const operands = [...index.relations.values()].filter(
    (entry) => entry.relation.relType.case === 'read'
  );
  const predicates = [...index.relations.values()].flatMap((entry) => {
    const relation = entry.relation.relType;
    return relation.case === 'join'
      ? [
          {
            id: entry.binding.relationId,
            inputs: entry.inputs,
            type: relation.value.type,
            expression: relation.value.expression,
          },
        ]
      : [];
  });
  expect(schemas.get(index.rootId)).to.have.length(root.fields.length);
  return { document, outputs: root.fields, operands, predicates };
}
