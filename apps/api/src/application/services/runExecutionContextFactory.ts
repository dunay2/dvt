/** Owned concern: construct the canonical persisted run-execution context. */
import {
  parseRunExecutionContext,
  type RunExecutionContext,
  type StartRunCommand,
} from '@dvt/contracts';

import type { AuthorizedCommandExecutionContext } from '../ports/authContract.js';
import type { WorkspaceStorageScope } from '../ports/workspaceFiles.js';

export function buildRunExecutionContext(input: {
  readonly command: StartRunCommand & { readonly planRef: NonNullable<StartRunCommand['planRef']> };
  readonly context: AuthorizedCommandExecutionContext;
  readonly scope: WorkspaceStorageScope;
  readonly pluginContexts: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly pluginCompatibilityFingerprint?: string;
}): RunExecutionContext {
  return parseRunExecutionContext({
    schemaVersion: 'v1.0',
    planId: input.command.planRef.planId,
    planVersion: input.command.planRef.planVersion,
    planSha256: input.command.planRef.sha256,
    ...(input.pluginCompatibilityFingerprint === undefined
      ? {}
      : { pluginCompatibilityFingerprint: input.pluginCompatibilityFingerprint }),
    tenantId: input.scope.tenantId,
    projectId: input.scope.projectId,
    environmentId: input.scope.environmentId,
    targetAdapter: input.command.targetAdapter,
    createdAtIso: resolveRunContextCreatedAtIso(input.command.runId, input.context.authorizedAt),
    createdBy: input.context.principal.principalId,
    pluginContexts: input.pluginContexts,
  });
}

function resolveRunContextCreatedAtIso(runId: string, authorizedAt: Date): string {
  const uuid = runId.startsWith('run_') ? runId.slice('run_'.length) : '';
  const segments = uuid.split('-');
  if (
    segments.length !== 5 ||
    segments[0]?.length !== 8 ||
    segments[1]?.length !== 4 ||
    segments[2]?.length !== 4 ||
    segments[2]?.[0] !== '7' ||
    !/^[0-9a-f]+$/u.test(segments.join(''))
  ) {
    return authorizedAt.toISOString();
  }

  const timestampMs = Number.parseInt(`${segments[0]}${segments[1]}`, 16);
  return new Date(timestampMs).toISOString();
}
