/** Customer/orders is a test fixture, never a product input restriction. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { createSourceJoin } from './canvasSourceJoin';
import type { ConnectedRelationSource } from './canvasSourceRelation';
import { source } from './canvasRelationalOperator.test-support';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { sourceFieldType } from './canvasSourceRelation';
import { functionIdentity, resolveDvtSubstraitJoinUnaryFunctions } from '@dvt/postgres-projection';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

export function createCustomerOrdersJoin(
  args: Readonly<{
    left: ConnectedRelationSource;
    right: ConnectedRelationSource;
    targetNodeId: string;
    joinType?: JoinRel_JoinType;
  }>
) {
  const leftOnly =
    args.joinType === JoinRel_JoinType.LEFT_SEMI || args.joinType === JoinRel_JoinType.LEFT_ANTI;
  const rightOnly =
    args.joinType === JoinRel_JoinType.RIGHT_SEMI || args.joinType === JoinRel_JoinType.RIGHT_ANTI;
  return createSourceJoin({
    ...args,
    left: { source: args.left, fields: ['customer_id', 'name'] },
    right: { source: args.right, fields: ['order_id', 'customer_id'] },
    leftFieldName: 'customer_id',
    rightFieldName: 'customer_id',
    outputs: [
      ...(rightOnly
        ? []
        : [
            { side: 0 as const, fieldName: 'customer_id', name: 'customer_id' },
            { side: 0 as const, fieldName: 'name', name: 'name' },
          ]),
      ...(leftOnly ? [] : [{ side: 1 as const, fieldName: 'order_id', name: 'order_id' }]),
    ],
  });
}

/** Unsupported imported shape: intentionally bypass authoring, never a production factory. */
export function functionBearingJoinFixture(port: 0 | 1 = 0) {
  const document = createCustomerOrdersJoin({
    left: source('left'),
    right: source('right'),
    targetNodeId: 'model',
  });
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root' || root.value.input?.relType.case !== 'join')
    throw new Error('Expected JOIN fixture.');
  const predicate = root.value.input.relType.value.expression!.rexType;
  if (predicate.case !== 'scalarFunction') throw new Error('Expected comparison.');
  const argument = predicate.value.arguments[port]!.argType;
  if (argument.case !== 'value') throw new Error('Expected comparison operand.');
  const fn = resolveDvtSubstraitJoinUnaryFunctions({
    dataType: 'string',
    provider: 'postgres',
  }).find((entry) => entry.name === 'trim')!;
  const identity = functionIdentity(fn)!;
  const declaration = dvtSubstraitExpression.ensureScalarFunction(document.plan, identity);
  argument.value = dvtSubstraitExpression.scalarFunction({
    functionReference: declaration.functionAnchor,
    arguments: [argument.value],
    outputType: sourceFieldType('string', true),
  });
  return decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(document));
}
