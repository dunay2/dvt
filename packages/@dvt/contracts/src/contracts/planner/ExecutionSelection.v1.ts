/**
 * Owned concern: define the canonical execution-selection command input for
 * preview and run over a workspace authoring draft.
 *
 * This contract describes operator intent only. It does not own auth,
 * compare-and-swap, audit, runtime admission, or mutable draft state.
 */
import { z } from 'zod';

import { isNonBlankString, NON_BLANK_STRING_MESSAGE } from '../../utils/contractPrimitives.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();

function buildSelectedNodeIdsSchema() {
  return z.array(NonBlankStringSchema).superRefine((nodeIds, ctx) => {
    if (nodeIds.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'ExecutionSelection nodeIds must contain at least one selected node id.',
      });
    }

    if (new Set(nodeIds).size !== nodeIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'ExecutionSelection nodeIds must be unique.',
      });
    }
  });
}

const SelectedNodeIdsSchema = buildSelectedNodeIdsSchema();

export const EXECUTION_SELECTION_MODE = {
  explicit: 'explicit',
  upstream: 'upstream',
  downstream: 'downstream',
  connectedComponent: 'connected_component',
} as const;

export type ExecutionSelectionMode =
  (typeof EXECUTION_SELECTION_MODE)[keyof typeof EXECUTION_SELECTION_MODE];

export const ExecutionSelectionSchema = z.discriminatedUnion('mode', [
  z
    .object({
      mode: z.literal(EXECUTION_SELECTION_MODE.explicit),
      nodeIds: SelectedNodeIdsSchema,
    })
    .strict(),
  z
    .object({
      mode: z.literal(EXECUTION_SELECTION_MODE.upstream),
      nodeIds: SelectedNodeIdsSchema,
    })
    .strict(),
  z
    .object({
      mode: z.literal(EXECUTION_SELECTION_MODE.downstream),
      nodeIds: SelectedNodeIdsSchema,
    })
    .strict(),
  z
    .object({
      mode: z.literal(EXECUTION_SELECTION_MODE.connectedComponent),
      nodeIds: SelectedNodeIdsSchema,
    })
    .strict(),
]);

export type ExecutionSelection = z.infer<typeof ExecutionSelectionSchema>;
