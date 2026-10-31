/** Owned concern: read one file's accepted dbt context without granting edit authority. */
import type { DbtProjectGraphProjection } from '@dvt/contracts';
import { useCallback, useMemo } from 'react';

import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import type { FileContent, WorkspaceFileSaveReceipt } from '../../ports/workspace';
import { useDbtProjectGraphQuery } from '../../queries/dbtProjectQueries';
import { projectDbtCodeReconciliationOutcome } from '../canvas/dbtProjectCodeReconciliation';
import { isCodeInlineReferenceFile } from './codeInlineReferences';
import type { CodeWorkingTreeReconciliationOutcome } from './codeWorkingTreeSyncModel';

export function useCodeWorkspaceFileContext({
  file,
  project,
  allowed,
}: Readonly<{
  file: FileContent | undefined;
  project: DbtProjectGraphProjection | undefined;
  allowed: boolean;
}>) {
  const resolution = file?.authoringAuthority;
  const explicitBinding = project?.authorityBinding;
  const inlineEligible = isCodeInlineReferenceFile(file);
  const binding = useMemo<DbtProjectFilesAuthorityBinding | undefined>(() => {
    if (!allowed || file === undefined) return undefined;
    if (resolution?.kind === 'unresolved') return undefined;
    const accepted = resolution?.kind === 'resolved' ? resolution.binding : explicitBinding;
    if (accepted?.authority.kind !== 'dbt-project-files') return undefined;
    if (
      explicitBinding !== undefined &&
      (explicitBinding.canvasId !== accepted.canvasId ||
        explicitBinding.authority.kind !== 'dbt-project-files' ||
        explicitBinding.authority.projectRoot !== accepted.authority.projectRoot)
    )
      return undefined;
    return { ...accepted, authority: accepted.authority };
  }, [allowed, file, resolution, explicitBinding]);
  const query = useDbtProjectGraphQuery(project === undefined ? binding : undefined, {
    enabled: inlineEligible,
    revisionToken: file?.contentSha256,
  });
  const refetch = query.refetch;
  const reconcilePersistedFile = useCallback(
    async (_receipt: WorkspaceFileSaveReceipt): Promise<CodeWorkingTreeReconciliationOutcome> => {
      if (binding === undefined) throw new Error('File project authority is unavailable.');
      const result = await refetch();
      if (!result.isSuccess || result.data == null) {
        throw result.error ?? new Error('The refreshed dbt project graph is unavailable.');
      }
      const accepted = result.data.authorityBinding;
      if (
        accepted.canvasId !== binding.canvasId ||
        accepted.authority.kind !== 'dbt-project-files' ||
        accepted.authority.projectRoot !== binding.authority.projectRoot
      ) {
        throw new Error('The refreshed graph belongs to another file authority.');
      }
      return projectDbtCodeReconciliationOutcome(result.data);
    },
    [binding, refetch]
  );
  const candidate = project ?? (query.isSuccess && !query.isFetching ? query.data : undefined);
  const acceptedProject =
    inlineEligible &&
    binding !== undefined &&
    candidate?.authorityBinding.canvasId === binding.canvasId &&
    candidate.authorityBinding.authority.kind === 'dbt-project-files' &&
    candidate.authorityBinding.authority.projectRoot === binding.authority.projectRoot
      ? candidate
      : undefined;
  const rejectedContext =
    project !== undefined ||
    (resolution?.kind === 'resolved' &&
      resolution.binding.authority.kind === 'dbt-project-files') ||
    (resolution?.kind === 'unresolved' && resolution.reason === 'mixed_authority');
  return {
    project: acceptedProject,
    status: !inlineEligible
      ? ('inactive' as const)
      : binding === undefined
        ? allowed && rejectedContext
          ? ('unavailable' as const)
          : ('inactive' as const)
        : acceptedProject !== undefined
          ? ('ready' as const)
          : query.isError || candidate !== undefined
            ? ('unavailable' as const)
            : ('checking' as const),
    reconcilePersistedFile:
      binding !== undefined && project === undefined ? reconcilePersistedFile : undefined,
  };
}
