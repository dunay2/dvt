/**
 * Owned concern: define type-only contracts for retained Explorer composition and navigation.
 * Reason: contract consumers must not depend on JSX display metadata or template ownership.
 * Corner invariant: the Elements body and the Elements/Git actions remain distinct from catalogue commands.
 */
import type { DragEvent, KeyboardEvent, ReactNode, RefObject } from 'react';
import type { ImperativePanelHandle } from '../../../components/ui/resizable';
import type {
  CanvasInspectorCommand,
  CanvasInspectorResource,
} from '../../../stores/canvasInspectorTarget';
import type { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasExplorerItem } from './canvasExplorerItems';

export type CanvasExplorerCopy = ReturnType<typeof resolveCanvasExplorerCopy>;
export type CanvasExplorerNavigationAction = 'elements' | 'git';
export type CanvasExplorerActivityRail = Readonly<{ codeVisible: boolean }>;
export type CanvasExplorerHeading = Readonly<{ label: string; contextLabel?: string }>;

export type CanvasProjectElementsInput = Readonly<{
  enabled: boolean;
  items: readonly CanvasExplorerItem[];
  canCreateInstances?: boolean;
  onInspectNode: CanvasInspectorCommand;
  inspectorTarget?: CanvasInspectorResource | null;
  catalogueScopeKey?: string;
  onDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void;
  onAddModel?: (opener: HTMLButtonElement) => void;
  onImport?: () => void;
  connections?: ReactNode;
}>;

export type CanvasExplorerProjectWorkspace = Readonly<{
  projectRoot?: string;
  onActivate: () => Promise<boolean>;
  onCanvas: () => void;
  renderElements?: (input: CanvasProjectElementsInput) => ReactNode;
}>;

export type CanvasExplorerTemplateProps = Readonly<{
  id: string;
  active: 'elements' | null;
  visible: boolean;
  dock: Readonly<{
    panelRef: RefObject<ImperativePanelHandle>;
    widthPercent: number;
    minSize: number;
    maxSize: number;
    onResize: (size: number, previousSize: number | undefined) => void;
  }>;
  copy: CanvasExplorerCopy;
  heading?: CanvasExplorerHeading;
  rootRef?: RefObject<HTMLDivElement>;
  elements: ReactNode;
  hasProjectFiles: boolean;
  children: ReactNode;
  workspaceTask?: ReactNode;
  activityRail?: CanvasExplorerActivityRail;
  shellOwned?: boolean;
  onToggle: (action: CanvasExplorerNavigationAction) => void;
  onKeyToggle: (
    action: CanvasExplorerNavigationAction,
    event: KeyboardEvent<HTMLButtonElement>
  ) => void;
  onCollapse: () => void;
  onClose: () => void;
}>;
