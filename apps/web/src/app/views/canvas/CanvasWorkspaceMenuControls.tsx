/**
 * Owned concern: publish Canvas workspace actions and render project snapshot commands.
 * @baseline GH-3765: project snapshots belong in the rail Project menu; files belong in Code.
 * @decision Retain the native picker receiver; notify its menu owner only after capturing a file.
 * @consequence Cancellation retains the receiver; file selection closes Project before existing dispatch.
 * @version 1.0.0
 */
import { Download, Upload, PanelsTopLeft } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '../../components/ui/dropdown-menu';
import type { CanvasWorkspaceMenuContribution } from './canvasWorkspaceMenuContributionStore';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import { canvasViewCopy } from './copy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasWorkspaceModelTabs } from './CanvasWorkspaceModelTabs';
import styles from './CanvasWorkspaceMenuControls.module.css';

type CanvasWorkspaceMenuContributionRegistrarProps = CanvasWorkspaceMenuContribution;

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
  const hasOpenProjectCodeCommand = props.onOpenProjectCode != null;
  const hasSelectCanvasCommand = props.onSelectCanvas != null;
  const hasCodeTab = props.codeTab != null;
  const hasCloseCodeCommand = props.codeTab?.onClose != null;
  const contribution = useMemo<CanvasWorkspaceMenuContribution>(
    () => ({
      activeCanvas:
        activeCanvas == null
          ? null
          : {
              id: activeCanvas.id,
              kind: activeCanvas.kind,
              title: activeCanvas?.title ?? canvasViewCopy.canvasContextMenuCanvasGroupLabel,
              environmentId: activeCanvas.environmentId,
              defaultPermission: activeCanvas.defaultPermission,
            },
      canExportProjectSnapshot: props.canExportProjectSnapshot,
      canvasDocuments: props.canvasDocuments,
      onSelectCanvas: hasSelectCanvasCommand
        ? (canvasId) => latestPropsRef.current.onSelectCanvas?.(canvasId)
        : undefined,
      canImportProjectSnapshot: props.canImportProjectSnapshot,
      canOpenProjectCode: props.canOpenProjectCode,
      ...(hasCodeTab
        ? {
            codeTab: {
              active: props.codeTab?.active === true,
              onSelect: () => latestPropsRef.current.codeTab?.onSelect(),
              onCanvas: () => latestPropsRef.current.codeTab?.onCanvas(),
              ...(hasCloseCodeCommand
                ? { onClose: () => latestPropsRef.current.codeTab?.onClose?.() }
                : {}),
            },
          }
        : {}),
      ...(hasExportProjectSnapshotCommand
        ? { onExportProjectSnapshot: () => latestPropsRef.current.onExportProjectSnapshot?.() }
        : {}),
      ...(hasImportProjectSnapshotCommand
        ? {
            onImportProjectSnapshotFile: (file: File) =>
              latestPropsRef.current.onImportProjectSnapshotFile?.(file),
          }
        : {}),
      ...(hasOpenProjectCodeCommand
        ? { onOpenProjectCode: () => latestPropsRef.current.onOpenProjectCode?.() }
        : {}),
    }),
    [
      activeCanvas?.defaultPermission,
      activeCanvas?.environmentId,
      activeCanvas?.id,
      activeCanvas?.kind,
      activeCanvas?.title,
      props.canExportProjectSnapshot,
      props.canvasDocuments,
      hasSelectCanvasCommand,
      props.canImportProjectSnapshot,
      props.canOpenProjectCode,
      hasExportProjectSnapshotCommand,
      hasImportProjectSnapshotCommand,
      hasOpenProjectCodeCommand,
      hasCodeTab,
      hasCloseCodeCommand,
      props.codeTab?.active,
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
  onSnapshotFileSelected?: () => void;
}>;

export function CanvasWorkspaceMenuControls({
  onSnapshotFileSelected,
}: CanvasWorkspaceMenuControlsProps = {}): JSX.Element | null {
  const contribution = useCanvasWorkspaceMenuContributionStore((state) => state.contribution);
  useApplicationLanguageStore((state) => state.language);
  const importInputRef = useRef<HTMLInputElement>(null);

  if (contribution == null) {
    return null;
  }

  return (
    <>
      {(contribution.canvasDocuments?.length ?? 0) > 1 ? (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            data-slot="canvas-workspace-canvases-command"
            disabled={contribution.onSelectCanvas == null}
          >
            <PanelsTopLeft aria-hidden="true" className={styles.menuIcon} />
            {canvasViewCopy.projectCanvasMenuLabel}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={contribution.activeCanvas?.id}
              onValueChange={contribution.onSelectCanvas}
            >
              {contribution.canvasDocuments?.map((canvas) => (
                <DropdownMenuRadioItem key={canvas.id} value={canvas.id}>
                  {canvas.title}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuLabel>{canvasViewCopy.toolbarProjectSnapshotMenuLabel}</DropdownMenuLabel>
      <DropdownMenuItem
        data-slot="canvas-workspace-export-command"
        disabled={
          !contribution.canExportProjectSnapshot || contribution.onExportProjectSnapshot == null
        }
        onSelect={() => contribution.onExportProjectSnapshot?.()}
      >
        <Download className={styles.menuIcon} />
        {canvasViewCopy.toolbarExportSnapshotLabel}
      </DropdownMenuItem>
      <DropdownMenuItem
        data-slot="canvas-workspace-import-command"
        disabled={
          !contribution.canImportProjectSnapshot || contribution.onImportProjectSnapshotFile == null
        }
        onSelect={(event) => {
          event.preventDefault();
          importInputRef.current?.click();
        }}
      >
        <Upload className={styles.menuIcon} />
        {canvasViewCopy.toolbarImportSnapshotLabel}
      </DropdownMenuItem>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        data-slot="canvas-workspace-import-input"
        className={styles.fileInput}
        aria-label={canvasViewCopy.toolbarImportSnapshotLabel}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file != null) {
            onSnapshotFileSelected?.();
            contribution.onImportProjectSnapshotFile?.(file);
          }
        }}
      />
    </>
  );
}

export function CanvasWorkspaceTopBarIdentity(): JSX.Element | null {
  const modelTab = useCanvasWorkspaceMenuContributionStore((state) => state.modelTab);
  const codeTab = useCanvasWorkspaceMenuContributionStore((state) => state.contribution?.codeTab);
  const activeCanvas = useCanvasWorkspaceMenuContributionStore(
    (state) => state.contribution?.activeCanvas ?? null
  );
  useApplicationLanguageStore((state) => state.language);

  if (activeCanvas == null && codeTab == null) {
    return null;
  }

  return (
    <div
      data-slot="shell-active-canvas-identity"
      data-canvas-id={activeCanvas?.id}
      data-kind={activeCanvas?.kind}
      className={styles.identity}
      aria-label={canvasViewCopy.workspaceActiveCanvasLabelTemplate.replace(
        '{title}',
        activeCanvas?.title ?? canvasViewCopy.canvasContextMenuCanvasGroupLabel
      )}
    >
      <CanvasWorkspaceModelTabs
        canvasTitle={activeCanvas?.title ?? canvasViewCopy.canvasContextMenuCanvasGroupLabel}
        tab={activeCanvas != null && modelTab?.canvasId === activeCanvas.id ? modelTab : undefined}
        codeTab={codeTab}
      />
    </div>
  );
}
