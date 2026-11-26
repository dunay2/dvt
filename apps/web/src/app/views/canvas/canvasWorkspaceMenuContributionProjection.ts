/**
 * Owned concern: project the existing Canvas menu snapshot and current callback delegates.
 * @baseline ResolveCanvasProjectSnapshotActions / SelectCanvasWorkbenchTab retain their owners.
 * @decision Metadata and availability own snapshot identity; delegates read the registrar's ref.
 * @consequence No extra registration, subscription or session is acquired here.
 */
import type { MutableRefObject } from 'react';
import type { CanvasWorkspaceMenuContribution } from './canvasWorkspaceMenuContributionStore';
import { canvasViewCopy } from './copy';

function projectCanvasIdentity(
  activeCanvas: CanvasWorkspaceMenuContribution['activeCanvas']
): NonNullable<CanvasWorkspaceMenuContribution['activeCanvas']> | null {
  if (activeCanvas == null) return null;
  return {
    id: activeCanvas.id,
    kind: activeCanvas.kind,
    title: activeCanvas.title ?? canvasViewCopy.canvasContextMenuCanvasGroupLabel,
    environmentId: activeCanvas.environmentId,
    defaultPermission: activeCanvas.defaultPermission,
  };
}

function bindWorkspaceMenuCallbacks(
  props: CanvasWorkspaceMenuContribution,
  latest: MutableRefObject<CanvasWorkspaceMenuContribution>
): Pick<
  CanvasWorkspaceMenuContribution,
  'onExportProjectSnapshot' | 'onImportProjectSnapshotFile' | 'onOpenProjectCode'
> {
  return {
    ...(props.onExportProjectSnapshot != null
      ? { onExportProjectSnapshot: () => latest.current.onExportProjectSnapshot?.() }
      : {}),
    ...(props.onImportProjectSnapshotFile != null
      ? {
          onImportProjectSnapshotFile: (file: File) =>
            latest.current.onImportProjectSnapshotFile?.(file),
        }
      : {}),
    ...(props.onOpenProjectCode != null
      ? { onOpenProjectCode: () => latest.current.onOpenProjectCode?.() }
      : {}),
  };
}

function projectWorkspaceCodeTab(
  codeTab: CanvasWorkspaceMenuContribution['codeTab'],
  latest: MutableRefObject<CanvasWorkspaceMenuContribution>
): CanvasWorkspaceMenuContribution['codeTab'] {
  if (codeTab == null) return undefined;
  return {
    active: codeTab.active === true,
    onSelect: () => latest.current.codeTab?.onSelect(),
    onCanvas: () => latest.current.codeTab?.onCanvas(),
    ...(codeTab.onClose != null ? { onClose: () => latest.current.codeTab?.onClose?.() } : {}),
  };
}

export function projectWorkspaceMenuContribution(
  latest: MutableRefObject<CanvasWorkspaceMenuContribution>
): CanvasWorkspaceMenuContribution {
  const props = latest.current;
  const codeTab = projectWorkspaceCodeTab(props.codeTab, latest);
  return {
    activeCanvas: projectCanvasIdentity(props.activeCanvas),
    canExportProjectSnapshot: props.canExportProjectSnapshot,
    canvasDocuments: props.canvasDocuments,
    onSelectCanvas:
      props.onSelectCanvas != null
        ? (canvasId) => latest.current.onSelectCanvas?.(canvasId)
        : undefined,
    canImportProjectSnapshot: props.canImportProjectSnapshot,
    canOpenProjectCode: props.canOpenProjectCode,
    ...(codeTab == null ? {} : { codeTab }),
    ...bindWorkspaceMenuCallbacks(props, latest),
  };
}
