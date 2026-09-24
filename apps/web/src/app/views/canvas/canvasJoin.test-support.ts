/** Customer/orders is a test fixture, never a product input restriction. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { createSourceJoin } from './canvasSourceJoin';
import type { ConnectedRelationSource } from './canvasSourceRelation';

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
