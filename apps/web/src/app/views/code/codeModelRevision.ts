/**
 * Owned concern: compare the accepted file-model revision with fresh query evidence.
 * @baseline ADR-0060: file authority and workspace scope constrain execution.
 * @decision Keep the admission predicate independent of React and transport adapters.
 * @consequence Commands can reject stale bytes or authority without interpreting UI state.
 * @version 1.0.0
 */
import type { CanvasAuthoringAuthorityBinding } from '@dvt/contracts';

import type { WorkspaceScope } from '../../ports/sessionContext';
import type { FileContent } from '../../ports/workspace';

type CodeModelRevision = Readonly<{
  file: FileContent;
  scope: WorkspaceScope;
}>;

/** Queries supply evidence; this predicate never reads, writes or executes a model. */
export function isCurrentCodeModelRevision(
  expected: CodeModelRevision & Readonly<{ authorityBinding: CanvasAuthoringAuthorityBinding }>,
  observed: CodeModelRevision
): boolean {
  const authority = observed.file.authoringAuthority;
  return (
    observed.scope.tenantId === expected.scope.tenantId &&
    observed.scope.projectId === expected.scope.projectId &&
    observed.scope.environmentId === expected.scope.environmentId &&
    observed.scope.targetAdapter === expected.scope.targetAdapter &&
    observed.file.path === expected.file.path &&
    observed.file.contentSha256 === expected.file.contentSha256 &&
    observed.file.content === expected.file.content &&
    authority?.kind === 'resolved' &&
    authority.binding.canvasId === expected.authorityBinding.canvasId &&
    authority.binding.authority.kind === 'dbt-project-files' &&
    expected.authorityBinding.authority.kind === 'dbt-project-files' &&
    authority.binding.authority.projectRoot === expected.authorityBinding.authority.projectRoot
  );
}
