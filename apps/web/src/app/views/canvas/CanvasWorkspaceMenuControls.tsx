/** Owned concern: render Canvas project commands inside the shell Workspace menu. */
import { Code2, Download, FolderOpen, Upload } from 'lucide-react';
import { useEffect, useRef } from 'react';

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import type { CanvasWorkspaceMenuContribution } from './canvasWorkspaceMenuContributionStore';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import { canvasViewCopy } from './copy';

type CanvasWorkspaceMenuContributionRegistrarProps = CanvasWorkspaceMenuContribution;

function resolveCanvasKindLabel(kind: string): string {
  return kind === 'dbt' ? 'dbt' : 'Transformation';
}

export function CanvasWorkspaceMenuContributionRegistrar(
  contribution: CanvasWorkspaceMenuContributionRegistrarProps
): null {
  const registerCanvasWorkspaceMenuContribution = useCanvasWorkspaceMenuContributionStore(
    (state) => state.registerCanvasWorkspaceMenuContribution
  );
  const clearCanvasWorkspaceMenuContribution = useCanvasWorkspaceMenuContributionStore(
    (state) => state.clearCanvasWorkspaceMenuContribution
  );

  useEffect(() => {
    registerCanvasWorkspaceMenuContribution(contribution);
    return () => {
      clearCanvasWorkspaceMenuContribution(contribution);
    };
  }, [clearCanvasWorkspaceMenuContribution, contribution, registerCanvasWorkspaceMenuContribution]);

  return null;
}

export function CanvasWorkspaceMenuControls(): JSX.Element | null {
  const contribution = useCanvasWorkspaceMenuContributionStore((state) => state.contribution);
  const importInputRef = useRef<HTMLInputElement>(null);

  if (contribution == null) {
    return null;
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Project</DropdownMenuLabel>
      <DropdownMenuItem
        data-slot="canvas-workspace-explore-project-command"
        disabled={
          !contribution.canOpenProjectExplorer || contribution.onOpenProjectExplorer == null
        }
        onClick={contribution.onOpenProjectExplorer}
      >
        <FolderOpen className="mr-2 size-4" />
        Explore project
      </DropdownMenuItem>
      <DropdownMenuItem
        data-slot="canvas-workspace-open-project-code-command"
        disabled={!contribution.canOpenProjectCode || contribution.onOpenProjectCode == null}
        onClick={contribution.onOpenProjectCode}
      >
        <Code2 className="mr-2 size-4" />
        Open project code
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>{canvasViewCopy.toolbarProjectSnapshotMenuLabel}</DropdownMenuLabel>
      <DropdownMenuItem
        data-slot="canvas-workspace-export-command"
        disabled={!contribution.canExportProjectSnapshot}
        onClick={contribution.onExportProjectSnapshot}
      >
        <Download className="mr-2 size-4" />
        {canvasViewCopy.toolbarExportSnapshotLabel}
      </DropdownMenuItem>
      <DropdownMenuItem
        data-slot="canvas-workspace-import-command"
        disabled={!contribution.canImportProjectSnapshot}
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
            contribution.onImportProjectSnapshotFile(file);
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

  if (activeCanvas == null) {
    return null;
  }

  return (
    <div
      data-slot="shell-active-canvas-identity"
      data-canvas-id={activeCanvas.id}
      data-kind={activeCanvas.kind}
      className="flex min-w-0 max-w-[24rem] items-center gap-2 rounded-sm border border-(--border-muted) bg-(--surface-panel-subtle) px-2.5 py-1 text-xs"
      aria-label={`Active canvas: ${activeCanvas.title}`}
    >
      <span className="truncate font-semibold text-(--text-primary)">{activeCanvas.title}</span>
      <span className="shrink-0 text-(--text-muted)">
        {resolveCanvasKindLabel(activeCanvas.kind)}
      </span>
    </div>
  );
}
