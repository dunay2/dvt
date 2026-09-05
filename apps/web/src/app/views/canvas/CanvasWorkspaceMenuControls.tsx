/** Owned concern: render Canvas project commands inside the shell Workspace menu. */
import { Code2, Download, FolderInput, FolderOpen, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import type { CanvasWorkspaceMenuContribution } from './canvasWorkspaceMenuContributionStore';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import { canvasViewCopy } from './copy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

type CanvasWorkspaceMenuContributionRegistrarProps = CanvasWorkspaceMenuContribution;

function resolveCanvasKindLabel(kind: string): string {
  return kind === 'dbt' ? 'dbt' : canvasViewCopy.workspaceTransformationKindLabel;
}

export function CanvasWorkspaceMenuContributionRegistrar(
  props: CanvasWorkspaceMenuContributionRegistrarProps
): null {
  const registerCanvasWorkspaceMenuContribution = useCanvasWorkspaceMenuContributionStore(
    (state) => state.registerCanvasWorkspaceMenuContribution
  );
  const clearCanvasWorkspaceMenuContribution = useCanvasWorkspaceMenuContributionStore(
    (state) => state.clearCanvasWorkspaceMenuContribution
  );
  const latestPropsRef = useRef(props);
  latestPropsRef.current = props;
  const activeCanvas = props.activeCanvas;
  const hasExportProjectSnapshotCommand = props.onExportProjectSnapshot != null;
  const hasImportProjectSnapshotCommand = props.onImportProjectSnapshotFile != null;
  const hasImportDbtProjectCommand = props.onImportDbtProject != null;
  const hasOpenProjectCodeCommand = props.onOpenProjectCode != null;
  const hasOpenProjectExplorerCommand = props.onOpenProjectExplorer != null;
  const contribution = useMemo<CanvasWorkspaceMenuContribution>(
    () => ({
      activeCanvas:
        activeCanvas == null
          ? null
          : {
              id: activeCanvas.id,
              kind: activeCanvas.kind,
              title: activeCanvas.title,
              environmentId: activeCanvas.environmentId,
              defaultPermission: activeCanvas.defaultPermission,
            },
      canExportProjectSnapshot: props.canExportProjectSnapshot,
      canImportProjectSnapshot: props.canImportProjectSnapshot,
      canImportDbtProject: props.canImportDbtProject,
      canOpenProjectCode: props.canOpenProjectCode,
      canOpenProjectExplorer: props.canOpenProjectExplorer,
      ...(hasExportProjectSnapshotCommand
        ? { onExportProjectSnapshot: () => latestPropsRef.current.onExportProjectSnapshot?.() }
        : {}),
      ...(hasImportProjectSnapshotCommand
        ? {
            onImportProjectSnapshotFile: (file: File) =>
              latestPropsRef.current.onImportProjectSnapshotFile?.(file),
          }
        : {}),
      ...(hasImportDbtProjectCommand
        ? { onImportDbtProject: () => latestPropsRef.current.onImportDbtProject?.() }
        : {}),
      ...(hasOpenProjectCodeCommand
        ? { onOpenProjectCode: () => latestPropsRef.current.onOpenProjectCode?.() }
        : {}),
      ...(hasOpenProjectExplorerCommand
        ? { onOpenProjectExplorer: () => latestPropsRef.current.onOpenProjectExplorer?.() }
        : {}),
    }),
    [
      activeCanvas?.defaultPermission,
      activeCanvas?.environmentId,
      activeCanvas?.id,
      activeCanvas?.kind,
      activeCanvas?.title,
      props.canExportProjectSnapshot,
      props.canImportDbtProject,
      props.canImportProjectSnapshot,
      props.canOpenProjectCode,
      props.canOpenProjectExplorer,
      hasExportProjectSnapshotCommand,
      hasImportProjectSnapshotCommand,
      hasImportDbtProjectCommand,
      hasOpenProjectCodeCommand,
      hasOpenProjectExplorerCommand,
    ]
  );

  useEffect(() => {
    registerCanvasWorkspaceMenuContribution(contribution);
    return () => {
      clearCanvasWorkspaceMenuContribution(contribution);
    };
  }, [clearCanvasWorkspaceMenuContribution, contribution, registerCanvasWorkspaceMenuContribution]);

  return null;
}

type CanvasWorkspaceMenuControlsProps = Readonly<{
  onProjectCodeSelected?: () => void;
}>;

export function CanvasWorkspaceMenuControls({
  onProjectCodeSelected,
}: CanvasWorkspaceMenuControlsProps = {}): JSX.Element | null {
  const contribution = useCanvasWorkspaceMenuContributionStore((state) => state.contribution);
  useApplicationLanguageStore((state) => state.language);
  const importInputRef = useRef<HTMLInputElement>(null);

  if (contribution == null) {
    return null;
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>{canvasViewCopy.workspaceProjectActionsMenuLabel}</DropdownMenuLabel>
      <DropdownMenuItem
        data-slot="canvas-workspace-import-dbt-project-command"
        disabled={!contribution.canImportDbtProject || contribution.onImportDbtProject == null}
        onClick={contribution.onImportDbtProject}
      >
        <FolderInput className="mr-2 size-4" />
        {canvasViewCopy.workspaceImportDbtProjectLabel}
      </DropdownMenuItem>
      <DropdownMenuItem
        data-slot="canvas-workspace-explore-project-command"
        disabled={
          !contribution.canOpenProjectExplorer || contribution.onOpenProjectExplorer == null
        }
        onClick={contribution.onOpenProjectExplorer}
      >
        <FolderOpen className="mr-2 size-4" />
        {canvasViewCopy.workspaceExploreProjectLabel}
      </DropdownMenuItem>
      <DropdownMenuItem
        data-slot="canvas-workspace-open-project-code-command"
        disabled={!contribution.canOpenProjectCode || contribution.onOpenProjectCode == null}
        onSelect={(event) => {
          event.preventDefault();
          onProjectCodeSelected?.();
          contribution.onOpenProjectCode?.();
        }}
      >
        <Code2 className="mr-2 size-4" />
        {canvasViewCopy.workspaceOpenProjectCodeLabel}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>{canvasViewCopy.toolbarProjectSnapshotMenuLabel}</DropdownMenuLabel>
      <DropdownMenuItem
        data-slot="canvas-workspace-export-command"
        disabled={
          !contribution.canExportProjectSnapshot || contribution.onExportProjectSnapshot == null
        }
        onClick={contribution.onExportProjectSnapshot}
      >
        <Download className="mr-2 size-4" />
        {canvasViewCopy.toolbarExportSnapshotLabel}
      </DropdownMenuItem>
      <DropdownMenuItem
        data-slot="canvas-workspace-import-command"
        disabled={
          !contribution.canImportProjectSnapshot || contribution.onImportProjectSnapshotFile == null
        }
        onClick={() => importInputRef.current?.click()}
      >
        <Upload className="mr-2 size-4" />
        {canvasViewCopy.toolbarImportSnapshotLabel}
      </DropdownMenuItem>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        data-slot="canvas-workspace-import-input"
        className="hidden"
        aria-label={canvasViewCopy.toolbarImportSnapshotLabel}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file != null) {
            contribution.onImportProjectSnapshotFile?.(file);
          }
        }}
      />
    </>
  );
}

export function CanvasWorkspaceTopBarIdentity(): JSX.Element | null {
  const activeCanvas = useCanvasWorkspaceMenuContributionStore(
    (state) => state.contribution?.activeCanvas ?? null
  );
  useApplicationLanguageStore((state) => state.language);

  if (activeCanvas == null) {
    return null;
  }

  return (
    <div
      data-slot="shell-active-canvas-identity"
      data-canvas-id={activeCanvas.id}
      data-kind={activeCanvas.kind}
      className="flex min-w-0 max-w-[calc(100%-2.5rem)] shrink-0 items-center gap-2 rounded-sm border border-(--border-muted) bg-(--surface-panel-subtle) px-2.5 py-1 text-xs sm:max-w-64 lg:max-w-[24rem]"
      aria-label={canvasViewCopy.workspaceActiveCanvasLabelTemplate.replace(
        '{title}',
        activeCanvas.title
      )}
    >
      <span className="truncate font-semibold text-(--text-primary)">{activeCanvas.title}</span>
      <span className="hidden shrink-0 text-(--text-muted) sm:inline">
        {resolveCanvasKindLabel(activeCanvas.kind)}
      </span>
    </div>
  );
}
