/** Synchronize the SQL disclosure with the existing resizable presentation panel. */
import { useEffect, useRef, type RefObject } from 'react';
import type { ImperativePanelHandle } from '../../../components/ui/resizable';

export function useCanvasModelSqlPanelLayout(open: boolean): RefObject<ImperativePanelHandle> {
  const panel = useRef<ImperativePanelHandle>(null);
  useEffect(() => {
    if (open) panel.current?.resize(35);
    else panel.current?.collapse();
  }, [open]);
  return panel;
}
