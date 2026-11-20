/** Owned concern: bind Explorer preferences to the shared Canvas dock geometry. */
import { CANVAS_EXPLORER_WIDTH } from '../../../stores/uiLayoutStore';
import { useCanvasSideDockResize } from '../useCanvasSideDockResize';

export function useCanvasExplorerResize({
  groupId,
  expanded,
  widthPercent,
  onWidthChange,
  onCollapse,
}: Readonly<{
  groupId: string;
  expanded: boolean;
  widthPercent: number;
  onWidthChange: (size: number) => void;
  onCollapse: () => void;
}>) {
  return useCanvasSideDockResize({
    groupId,
    expanded,
    width: widthPercent,
    maxSize: CANVAS_EXPLORER_WIDTH.max,
    onWidthChange,
    onCollapse,
  });
}
