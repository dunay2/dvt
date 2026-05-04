/**
 * Owned concern: publish the complete protected runtime command/query rail
 * catalog from concern-local rail modules.
 */
import { type ProtectedRuntimeCommandQueryRail } from './protectedRuntimeCommandQueryRailTypes.js';
import { PROTECTED_RUNTIME_PLAN_COMMAND_QUERY_RAILS } from './protectedRuntimePlanCommandQueryRails.js';
import { PROTECTED_RUNTIME_RUN_COMMAND_QUERY_RAILS } from './protectedRuntimeRunCommandQueryRails.js';
import { PROTECTED_RUNTIME_WORKSPACE_COMMAND_QUERY_RAILS } from './protectedRuntimeWorkspaceCommandQueryRails.js';

export type {
  ProtectedRuntimeCommandQueryRail,
  ProtectedRuntimeCompatibilityPosture,
  ProtectedRuntimeNegativeCoverage,
  ProtectedRuntimeRailKind,
} from './protectedRuntimeCommandQueryRailTypes.js';

export const PROTECTED_RUNTIME_COMMAND_QUERY_RAILS = [
  ...PROTECTED_RUNTIME_PLAN_COMMAND_QUERY_RAILS,
  ...PROTECTED_RUNTIME_WORKSPACE_COMMAND_QUERY_RAILS,
  ...PROTECTED_RUNTIME_RUN_COMMAND_QUERY_RAILS,
] as const satisfies readonly ProtectedRuntimeCommandQueryRail[];
