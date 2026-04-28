/** Owned concern: resolve Canvas playground tab-strip replacement policy and commands without JSX. */
import type { CanvasKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasCreateCanvasDocumentCommand } from './canvasDraftLifecycle.types';
import type { CanvasPlaygroundTabState } from './canvasPlaygroundTabState';

export type CanvasReplacementActionCopy = Pick<
  CanvasViewCopy,
  | 'newCanvasLabel'
  | 'mutationUnavailableMessage'
  | 'replaceCanvasTitle'
  | 'replaceCanvasMessage'
  | 'replaceCanvasCancelLabel'
  | 'replaceCanvasConfirmLabel'
>;

export type CanvasReplacementActionViewState = Readonly<{
  canReplaceCanvas: boolean;
  buttonTitle: string;
  buttonLabel: string;
  dialogTitle: string;
  dialogDescription: string;
  cancelLabel: string;
  confirmLabel: string;
}>;

export type CanvasReplacementActionState = Readonly<{
  activeCanvasKind: CanvasKindRegistration | null;
  viewState: CanvasReplacementActionViewState;
}>;

export function hasRenderableCanvasTabs(tabState: CanvasPlaygroundTabState): boolean {
  return tabState.tabs.length > 0 && tabState.activeTabId != null;
}

function resolveActiveReplacementCanvasKind(args: {
  tabState: CanvasPlaygroundTabState;
  availableCanvasKinds: readonly CanvasKindRegistration[];
}): CanvasKindRegistration | null {
  const activeTab = args.tabState.tabs.find((tab) => tab.id === args.tabState.activeTabId);
  if (activeTab == null) {
    return null;
  }

  return (
    args.availableCanvasKinds.find((registration) => registration.kind === activeTab.kind) ?? null
  );
}

export function resolveCanvasReplacementActionState(args: {
  tabState: CanvasPlaygroundTabState;
  availableCanvasKinds: readonly CanvasKindRegistration[];
  canEditEdges: boolean;
  onCreateCanvasDocument?: (command: CanvasCreateCanvasDocumentCommand) => void;
  copy: CanvasReplacementActionCopy;
}): CanvasReplacementActionState {
  const activeCanvasKind = resolveActiveReplacementCanvasKind(args);
  const canReplaceCanvas =
    args.canEditEdges && activeCanvasKind != null && args.onCreateCanvasDocument != null;

  return {
    activeCanvasKind,
    viewState: {
      canReplaceCanvas,
      buttonTitle: canReplaceCanvas
        ? args.copy.newCanvasLabel
        : args.copy.mutationUnavailableMessage,
      buttonLabel: args.copy.newCanvasLabel,
      dialogTitle: args.copy.replaceCanvasTitle,
      dialogDescription: args.copy.replaceCanvasMessage,
      cancelLabel: args.copy.replaceCanvasCancelLabel,
      confirmLabel: args.copy.replaceCanvasConfirmLabel,
    },
  };
}

export function createReplaceCurrentCanvasDocumentCommand(
  canvasKind: CanvasKindRegistration
): CanvasCreateCanvasDocumentCommand {
  return {
    kind: canvasKind.kind,
    title: canvasKind.createTitle,
    mode: 'replace_current',
  };
}
