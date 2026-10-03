/** Resolve a declared workspace file without manufacturing a path from a node name. */
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';

export function resolveWorkspaceFilePath(
  data: Pick<DbtNodeData, 'presentationTruth' | 'path'>
): string | null {
  const codeTruth = data.presentationTruth?.code;
  if (codeTruth?.kind === 'workspace-file') return codeTruth.path;
  return typeof data.path === 'string' && data.path.trim().length > 0 ? data.path : null;
}
