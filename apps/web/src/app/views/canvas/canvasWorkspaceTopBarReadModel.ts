/**
 * Owned concern: project active Canvas identity and exclude foreign tab contributions.
 * @baseline SelectCanvasWorkbenchTab preserves the existing scoped navigation callbacks.
 * @decision Expose only current-Canvas Model data and the established fallback title.
 * @consequence This read model adds no store, subscription or command dispatch.
 */
import type {
  CanvasModelBrowserContribution,
  CanvasModelTabListContribution,
  CanvasModelWorkspaceTabContribution,
  CanvasWorkspaceMenuContribution,
} from './canvasWorkspaceMenuContributionStore';
import { canvasViewCopy } from './copy';

type CanvasWorkspaceTopBarProjectionInput = Readonly<{
  activeCanvas: CanvasWorkspaceMenuContribution['activeCanvas'];
  modelTab: CanvasModelWorkspaceTabContribution | null;
  modelTabList: CanvasModelTabListContribution | null;
  modelBrowser: CanvasModelBrowserContribution | null;
}>;

type CanvasWorkspaceTopBarReadModel = Readonly<{
  canvasTitle: string;
  canvasId?: string;
  canvasKind?: NonNullable<CanvasWorkspaceMenuContribution['activeCanvas']>['kind'];
  tab?: CanvasModelWorkspaceTabContribution;
  modelTabs?: CanvasModelTabListContribution['tabs'];
  onShowCanvas?: CanvasModelBrowserContribution['onCanvas'];
}>;

export function projectCanvasWorkspaceTopBar({
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
