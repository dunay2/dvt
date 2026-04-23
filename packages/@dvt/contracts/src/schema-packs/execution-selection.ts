import { z } from 'zod';

export {
  EXECUTABLE_SUBGRAPH_DIAGNOSTIC_CODE,
  EXECUTION_SELECTION_MODE,
  ExecutableSubgraphDiagnosticSchema,
  ExecutableSubgraphSchema,
  ExecutionSelectionSchema,
} from '../contracts/planner/index.js';

import {
  ExecutableSubgraphDiagnosticSchema,
  ExecutableSubgraphSchema,
  ExecutionSelectionSchema,
} from '../contracts/planner/index.js';

export type ExecutionSelectionSchemaT = z.infer<typeof ExecutionSelectionSchema>;
export type ExecutableSubgraphDiagnosticSchemaT = z.infer<
  typeof ExecutableSubgraphDiagnosticSchema
>;
export type ExecutableSubgraphSchemaT = z.infer<typeof ExecutableSubgraphSchema>;
