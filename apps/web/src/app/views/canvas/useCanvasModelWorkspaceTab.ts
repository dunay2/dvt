/** Owned concern: contribute Model navigation commands, never its semantic draft, to the shell. */
import { useEffect, useMemo, useRef } from 'react';
import {
  useCanvasWorkspaceMenuContributionStore,
  type CanvasModelWorkspaceTabContribution,
} from './canvasWorkspaceMenuContributionStore';

export function useCanvasModelWorkspaceTab(props: CanvasModelWorkspaceTabContribution): void {
  const latest = useRef(props);
  latest.current = props;
  const tab = useMemo<CanvasModelWorkspaceTabContribution>(
    () => ({
      canvasId: props.canvasId,
      nodeId: props.nodeId,
      label: props.label,
      active: props.active,
      onSelect: () => latest.current.onSelect(),
      onCanvas: () => latest.current.onCanvas(),
      onClose: (afterClose) => latest.current.onClose(afterClose),
      views:
        props.views == null
          ? undefined
          : {
              active: props.views.active,
              sqlPanelId: props.views.sqlPanelId,
              disabled: props.views.disabled,
              semantic: () => latest.current.views?.semantic(),
              sql: () => latest.current.views?.sql(),
            },
    }),
    [
      props.canvasId,
      props.nodeId,
      props.label,
      props.active,
      props.views?.active,
      props.views?.sqlPanelId,
      props.views?.disabled,
    ]
  );
  useEffect(() => {
    const store = useCanvasWorkspaceMenuContributionStore.getState();
    store.registerModelTab(tab);
    return () => store.clearModelTab(tab);
  }, [tab]);
}
