import { z } from 'zod';

import { GENERIC_GRAPH_SOURCE_KIND } from '../contracts/planner/ExecutionPlan.v1.js';

export const GenericGraphNodeV1Schema = z
  .object({
    nodeId: z.string().min(1),
    stepKind: z.string().min(1),
    dependsOn: z.array(z.string().min(1)),
    stepTypeConfig: z.record(z.string(), z.unknown()).optional(),
    metadata: z
      .object({
        displayName: z.string().min(1).optional(),
        sourceRef: z.string().min(1).optional(),
        tags: z.record(z.string(), z.string()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const GenericGraphSourceV1Schema = z
  .object({
    kind: z.literal(GENERIC_GRAPH_SOURCE_KIND),
    sourceFamily: z.string().min(1),
    sourceVersion: z.string().min(1),
    nodes: z.array(GenericGraphNodeV1Schema).min(1),
  })
  .superRefine((graphSource, ctx) => {
    const nodeIds = new Set<string>();
    for (const [index, node] of graphSource.nodes.entries()) {
      if (nodeIds.has(node.nodeId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['nodes', index, 'nodeId'],
          message: `Duplicate nodeId: ${node.nodeId}`,
        });
      }
      nodeIds.add(node.nodeId);
    }

    for (const [index, node] of graphSource.nodes.entries()) {
      for (const [depIndex, dep] of node.dependsOn.entries()) {
        if (!nodeIds.has(dep)) {
          ctx.addIssue({
            code: 'custom',
            path: ['nodes', index, 'dependsOn', depIndex],
            message: `Node ${node.nodeId} dependsOn missing node: ${dep}`,
          });
        }
      }
    }
  })
  .strict();

export type GenericGraphNodeV1SchemaT = z.infer<typeof GenericGraphNodeV1Schema>;
export type GenericGraphSourceV1SchemaT = z.infer<typeof GenericGraphSourceV1Schema>;
