/**
 * Owned concern: define the canonical derived selected-closure read model used
 * to validate preview and run intent over a workspace authoring draft.
 *
 * This contract owns selected closure ids, executability posture, and
 * diagnostics. It does not own persistence, auth, runtime admission, or the
 * editable draft aggregate itself.
 *
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Publish selected executable closure as a derived read model separate from editable authoring truth.
 * @consequence Preview and run callers can validate selection intent without persisting a second draft family.
 * @version 1.0.0
 */
import { z } from 'zod';

import { isNonBlankString, NON_BLANK_STRING_MESSAGE } from '../../utils/contractPrimitives.js';

import { ExecutionSelectionSchema, type ExecutionSelection } from './ExecutionSelection.v1.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();

function buildUniqueStringArraySchema(
  label: string
): z.ZodType<Array<z.infer<typeof NonBlankStringSchema>>> {
  return z.array(NonBlankStringSchema).superRefine((values, ctx) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: `${label} must be unique.`,
      });
    }
  });
}

const NodeIdsSchema = buildUniqueStringArraySchema('ExecutableSubgraph nodeIds');
const EdgeIdsSchema = buildUniqueStringArraySchema('ExecutableSubgraph edgeIds');
const DiagnosticNodeIdsSchema = buildUniqueStringArraySchema(
  'ExecutableSubgraph diagnostic nodeIds'
);
const DiagnosticEdgeIdsSchema = buildUniqueStringArraySchema(
  'ExecutableSubgraph diagnostic edgeIds'
);

export const EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE = {
  selectedNodeMissing: 'selected_node_missing',
  dependencyGap: 'dependency_gap',
  cycleDetected: 'cycle_detected',
  unsupportedSelectionMode: 'unsupported_selection_mode',
} as const;

export type ExecutableSubgraphDiagnosticCode =
  (typeof EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE)[keyof typeof EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE];

export interface ExecutableSubgraphDiagnostic {
  code: ExecutableSubgraphDiagnosticCode;
  message: string;
  nodeIds?: string[] | undefined;
  edgeIds?: string[] | undefined;
}

export interface ExecutableSubgraph {
  selection: ExecutionSelection;
  nodeIds: string[];
  edgeIds: string[];
  executable: boolean;
  diagnostics: ExecutableSubgraphDiagnostic[];
}

export const ExecutableSubgraphDiagnosticSchema = z
  .object({
    code: z.enum([
      EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE.selectedNodeMissing,
      EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE.dependencyGap,
      EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE.cycleDetected,
      EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE.unsupportedSelectionMode,
    ]),
    message: NonBlankStringSchema,
    nodeIds: DiagnosticNodeIdsSchema.optional(),
    edgeIds: DiagnosticEdgeIdsSchema.optional(),
  })
  .strict() satisfies z.ZodType<ExecutableSubgraphDiagnostic>;

export const ExecutableSubgraphSchema = z
  .object({
    selection: ExecutionSelectionSchema,
    nodeIds: NodeIdsSchema,
    edgeIds: EdgeIdsSchema,
    executable: z.boolean(),
    diagnostics: z.array(ExecutableSubgraphDiagnosticSchema),
  })
  .strict()
  .superRefine((subgraph, ctx) => {
    if (subgraph.executable) {
      if (subgraph.nodeIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['nodeIds'],
          message: 'ExecutableSubgraph executable closures must contain at least one node id.',
        });
      }
      if (subgraph.diagnostics.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['diagnostics'],
          message: 'ExecutableSubgraph executable closures must not carry blocking diagnostics.',
        });
      }
      return;
    }

    if (subgraph.diagnostics.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['diagnostics'],
        message: 'ExecutableSubgraph non-executable closures must report diagnostics.',
      });
    }
  }) satisfies z.ZodType<ExecutableSubgraph>;
