/** Owned concern: correlate a save receipt with the final authoritative file read. */
import type { FileContent, WorkspaceFileSaveReceipt } from '../../ports/workspace';
import type { CodeWorkingTreeReconciliationOutcome } from './codeWorkingTreeSyncModel';

export function reconcileWorkspaceFileAuthority(
  receipt: WorkspaceFileSaveReceipt,
  authoritativeFile: FileContent,
  projectOutcome: CodeWorkingTreeReconciliationOutcome
): CodeWorkingTreeReconciliationOutcome {
  if (
    authoritativeFile.path !== receipt.path ||
    authoritativeFile.contentSha256 !== receipt.contentSha256
  ) {
    return {
      kind: 'superseded',
      currentContentSha256: authoritativeFile.contentSha256,
    };
  }
  return projectOutcome;
}
