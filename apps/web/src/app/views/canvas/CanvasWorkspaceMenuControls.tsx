/**
 * Owned concern: publish Canvas workspace actions and render project snapshot commands.
 * @baseline GH-3765: project snapshots belong in the rail Project menu; files belong in Code.
 * @decision Retain the native picker receiver; notify its menu owner only after capturing a file.
 * @consequence Cancellation retains the receiver; file selection closes Project before existing dispatch.
 * @version 1.0.0
 */
import { Download, Upload, PanelsTopLeft } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type ComponentProps,
  type MutableRefObject,
} from 'react';

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
import type {
  CanvasModelBrowserContribution,
  CanvasModelTabListContribution,
  CanvasModelWorkspaceTabContribution,
  CanvasWorkspaceMenuContribution,
} from './canvasWorkspaceMenuContributionStore';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import { canvasViewCopy } from './copy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasWorkspaceModelTabs } from './CanvasWorkspaceModelTabs';
import styles from './CanvasWorkspaceMenuControls.module.css';

type CanvasWorkspaceMenuContributionRegistrarProps = CanvasWorkspaceMenuContribution;

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
  'onSelectCanvas' | 'onExportProjectSnapshot' | 'onImportProjectSnapshotFile' | 'onOpenProjectCode'
> {
  return {
    onSelectCanvas:
      props.onSelectCanvas != null
        ? (canvasId) => latest.current.onSelectCanvas?.(canvasId)
        : undefined,
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

function projectWorkspaceMenuContribution(
  latest: MutableRefObject<CanvasWorkspaceMenuContribution>
): CanvasWorkspaceMenuContribution {
  const props = latest.current;
  const codeTab = projectWorkspaceCodeTab(props.codeTab, latest);
  return {
    activeCanvas: projectCanvasIdentity(props.activeCanvas),
    canExportProjectSnapshot: props.canExportProjectSnapshot,
    canvasDocuments: props.canvasDocuments,
    canImportProjectSnapshot: props.canImportProjectSnapshot,
    canOpenProjectCode: props.canOpenProjectCode,
    ...(codeTab == null ? {} : { codeTab }),
    ...bindWorkspaceMenuCallbacks(props, latest),
  };
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
  const hasOpenProjectCodeCommand = props.onOpenProjectCode != null;
  const hasSelectCanvasCommand = props.onSelectCanvas != null;
  const hasCodeTab = props.codeTab != null;
  const hasCloseCodeCommand = props.codeTab?.onClose != null;
  const contribution = useMemo<CanvasWorkspaceMenuContribution>(
    () => projectWorkspaceMenuContribution(latestPropsRef),
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

function CanvasDocumentSelectionMenu({
  canvasDocuments,
  activeCanvas,
  onSelectCanvas,
}: Pick<
  CanvasWorkspaceMenuContribution,
  'canvasDocuments' | 'activeCanvas' | 'onSelectCanvas'
>): JSX.Element | null {
  if (canvasDocuments == null || canvasDocuments.length <= 1) return null;
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        data-slot="canvas-workspace-canvases-command"
        disabled={onSelectCanvas == null}
      >
        <PanelsTopLeft aria-hidden="true" className={styles.menuIcon} />
        {canvasViewCopy.projectCanvasMenuLabel}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={activeCanvas?.id} onValueChange={onSelectCanvas}>
          {canvasDocuments.map((canvas) => (
            <DropdownMenuRadioItem key={canvas.id} value={canvas.id}>
              {canvas.title}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

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
      <CanvasDocumentSelectionMenu
        canvasDocuments={contribution.canvasDocuments}
        activeCanvas={contribution.activeCanvas}
        onSelectCanvas={contribution.onSelectCanvas}
      />
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
        onChange={(event) =>
          handoffProjectSnapshotFile(
            event,
            onSnapshotFileSelected,
            contribution.onImportProjectSnapshotFile
          )
        }
      />
    </>
  );
}

function handoffProjectSnapshotFile(
  event: ChangeEvent<HTMLInputElement>,
  onSnapshotFileSelected: (() => void) | undefined,
  onImportProjectSnapshotFile: CanvasWorkspaceMenuContribution['onImportProjectSnapshotFile']
): void {
  const file = event.currentTarget.files?.[0];
  event.currentTarget.value = '';
  if (file == null) return;
  onSnapshotFileSelected?.();
  onImportProjectSnapshotFile?.(file);
}

type CanvasWorkspaceTopBarProjectionInput = Readonly<{
  activeCanvas: CanvasWorkspaceMenuContribution['activeCanvas'];
  modelTab: CanvasModelWorkspaceTabContribution | null;
  modelTabList: CanvasModelTabListContribution | null;
  modelBrowser: CanvasModelBrowserContribution | null;
}>;

type CanvasWorkspaceTopBarReadModel = Pick<
  ComponentProps<typeof CanvasWorkspaceModelTabs>,
  'canvasTitle' | 'tab' | 'modelTabs' | 'onShowCanvas'
> &
  Readonly<{
    canvasId?: string;
    canvasKind?: NonNullable<CanvasWorkspaceMenuContribution['activeCanvas']>['kind'];
  }>;

function projectCanvasWorkspaceTopBar({
  activeCanvas,
  modelTab,
  modelTabList,
  modelBrowser,
}: CanvasWorkspaceTopBarProjectionInput): CanvasWorkspaceTopBarReadModel {
  if (activeCanvas == null)
    return { canvasTitle: canvasViewCopy.canvasContextMenuCanvasGroupLabel };
  return {
    canvasId: activeCanvas.id,
    canvasKind: activeCanvas.kind,
    canvasTitle: activeCanvas.title ?? canvasViewCopy.canvasContextMenuCanvasGroupLabel,
    tab: modelTab?.canvasId === activeCanvas.id ? modelTab : undefined,
    modelTabs: modelTabList?.canvasId === activeCanvas.id ? modelTabList.tabs : undefined,
    onShowCanvas: modelBrowser?.canvasId === activeCanvas.id ? modelBrowser.onCanvas : undefined,
  };
}

export function CanvasWorkspaceTopBarIdentity(): JSX.Element | null {
  const modelTab = useCanvasWorkspaceMenuContributionStore((state) => state.modelTab);
  const modelTabList = useCanvasWorkspaceMenuContributionStore((state) => state.modelTabList);
  const modelBrowser = useCanvasWorkspaceMenuContributionStore((state) => state.modelBrowser);
  const codeTab = useCanvasWorkspaceMenuContributionStore((state) => state.contribution?.codeTab);
  const activeCanvas = useCanvasWorkspaceMenuContributionStore(
    (state) => state.contribution?.activeCanvas ?? null
  );
  useApplicationLanguageStore((state) => state.language);

  if (activeCanvas == null && codeTab == null) {
    return null;
  }

  const identity = projectCanvasWorkspaceTopBar({
    activeCanvas,
    modelTab,
    modelTabList,
    modelBrowser,
  });

  return (
    <div
      data-slot="shell-active-canvas-identity"
      data-canvas-id={identity.canvasId}
      data-kind={identity.canvasKind}
      className={styles.identity}
      aria-label={canvasViewCopy.workspaceActiveCanvasLabelTemplate.replace(
        '{title}',
        identity.canvasTitle
      )}
    >
      <CanvasWorkspaceModelTabs
        canvasTitle={identity.canvasTitle}
        tab={identity.tab}
        modelTabs={identity.modelTabs}
        codeTab={codeTab}
        onShowCanvas={identity.onShowCanvas}
      />
    </div>
  );
}
