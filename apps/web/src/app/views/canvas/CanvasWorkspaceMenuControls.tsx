/** Owned concern: render Canvas project commands inside the shell Workspace menu. */
import { useEffect, useRef } from 'react';
import { Download, Upload } from 'lucide-react';

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import { canvasViewCopy } from './copy';
import type { CanvasWorkspaceMenuContribution } from './canvasWorkspaceMenuContributionStore';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';

type CanvasWorkspaceMenuContributionRegistrarProps = CanvasWorkspaceMenuContribution;

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
