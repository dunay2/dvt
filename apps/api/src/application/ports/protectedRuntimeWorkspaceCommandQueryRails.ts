/**
 * Owned concern: catalog protected workspace draft and file command/query rails.
 */
import {
  defineProtectedRuntimeRail,
  type ProtectedRuntimeCommandQueryRail,
} from './protectedRuntimeCommandQueryRailTypes.js';
import {
  PROTECTED_RUNTIME_NEGATIVE_CASE,
  PROTECTED_RUNTIME_RAIL_KIND,
  PROTECTED_RUNTIME_TEST_REF,
  PROTECTED_RUNTIME_WORKSPACE_RAIL,
} from './protectedRuntimeRailVocabulary.js';

function buildWorkspaceFileNegativeCoverage(
  cases: readonly string[]
): readonly (readonly [string, string])[] {
  return cases.map(
    (negativeCase) => [negativeCase, PROTECTED_RUNTIME_TEST_REF.workspaceFilesRoutes] as const
  );
}

export const PROTECTED_RUNTIME_WORKSPACE_COMMAND_QUERY_RAILS = [
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_WORKSPACE_RAIL.getEffectiveWorkspaceContext,
    kind: PROTECTED_RUNTIME_RAIL_KIND.query,
    coverage: [
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken,
        PROTECTED_RUNTIME_TEST_REF.workspaceContextRoute,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.workspaceContextNotGranted,
        PROTECTED_RUNTIME_TEST_REF.workspaceContextRoute,
      ],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_WORKSPACE_RAIL.getWorkspaceGraphDraft,
    kind: PROTECTED_RUNTIME_RAIL_KIND.query,
    coverage: [
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken,
        PROTECTED_RUNTIME_TEST_REF.workspaceDraftRoutes,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction,
        PROTECTED_RUNTIME_TEST_REF.workspaceDraftAuth,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.tenantWorkspaceMismatch,
        PROTECTED_RUNTIME_TEST_REF.workspaceDraftAuth,
      ],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_WORKSPACE_RAIL.saveWorkspaceGraphDraft,
    kind: PROTECTED_RUNTIME_RAIL_KIND.command,
    coverage: [
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken,
        PROTECTED_RUNTIME_TEST_REF.workspaceDraftRoutes,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction,
        PROTECTED_RUNTIME_TEST_REF.workspaceDraftAuth,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.tenantWorkspaceMismatch,
        PROTECTED_RUNTIME_TEST_REF.workspaceDraftAuth,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.staleAuthority,
        PROTECTED_RUNTIME_TEST_REF.workspaceDraftRoutes,
      ],
    ],
  }),
  defineProtectedRuntimeRail({
    name: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.listName,
    kind: PROTECTED_RUNTIME_RAIL_KIND.query,
    boundedContext: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.boundedContext,
    dddObject: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.treeReadModel,
    applicationPort: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.listPort,
    adapterSurface: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.listSurface,
    scopeAndAuthorization: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.scopeAndAuthorization,
    coverage: buildWorkspaceFileNegativeCoverage([
      PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken,
      PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction,
      PROTECTED_RUNTIME_NEGATIVE_CASE.missingScope,
    ]),
  }),
  defineProtectedRuntimeRail({
    name: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.getContentName,
    kind: PROTECTED_RUNTIME_RAIL_KIND.query,
    boundedContext: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.boundedContext,
    dddObject: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.contentReadModel,
    applicationPort: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.getContentPort,
    adapterSurface: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.getContentSurface,
    scopeAndAuthorization: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceFiles.scopeAndAuthorization,
    coverage: buildWorkspaceFileNegativeCoverage([
      PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken,
      PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction,
      PROTECTED_RUNTIME_NEGATIVE_CASE.missingFile,
      PROTECTED_RUNTIME_NEGATIVE_CASE.invalidPath,
    ]),
  }),
  defineProtectedRuntimeRail({
    name: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceDiffChanges.name,
    kind: PROTECTED_RUNTIME_RAIL_KIND.query,
    boundedContext: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceDiffChanges.boundedContext,
    dddObject: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceDiffChanges.readModel,
    applicationPort: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceDiffChanges.port,
    adapterSurface: PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceDiffChanges.surface,
    scopeAndAuthorization:
      PROTECTED_RUNTIME_WORKSPACE_RAIL.workspaceDiffChanges.scopeAndAuthorization,
    coverage: [
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken,
        PROTECTED_RUNTIME_TEST_REF.workspaceDiffChangesRoutes,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction,
        PROTECTED_RUNTIME_TEST_REF.workspaceDiffChangesRoutes,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingScope,
        PROTECTED_RUNTIME_TEST_REF.workspaceDiffChangesRoutes,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.invalidGraphSource,
        PROTECTED_RUNTIME_TEST_REF.workspaceDiffChangesRoutes,
      ],
    ],
  }),
] as const satisfies readonly ProtectedRuntimeCommandQueryRail[];
