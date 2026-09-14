/** Owned concern: route transient Canvas semantic focus and restore its invoking element. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import type { GraphNodeColumnInspect } from '../../plugins/graph/graphNodeColumnContracts';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import { canOpenSemanticTransformFocus } from './SemanticTransformFocusPanel';

export function useCanvasSemanticFocus(nodes: readonly CanonicalNode[]) {
  const [focus, setFocus] = useState<{ nodeId: string; fieldId?: string } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pendingTabFocus = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (pendingTabFocus.current != null) cancelAnimationFrame(pendingTabFocus.current);
    },
    []
  );
  const showBottomDrawer = useUiLayoutStore((state) => state.showBottomDrawer);
  const selectTab = useOperationalDrawerContributionStore(
    (state) => state.selectOperationalDrawerTab
  );
  const semanticTransformIds = useMemo(
    () => new Set(nodes.filter(canOpenSemanticTransformFocus).map((node) => node.id)),
    [nodes]
  );
  const semanticTransform =
    nodes.find((node) => node.id === focus?.nodeId && semanticTransformIds.has(node.id)) ?? null;
  const openSemanticTransform = useCallback(
    (nodeId: string) => {
      if (!semanticTransformIds.has(nodeId)) return;
      setFocus({ nodeId });
      selectTab('semantic');
      showBottomDrawer(360);
      if (pendingTabFocus.current != null) cancelAnimationFrame(pendingTabFocus.current);
      pendingTabFocus.current = window.requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(
            '[data-slot="bottom-operational-drawer-tab"][data-tab="semantic"]'
          )
          ?.focus({ preventScroll: true })
      );
    },
    [semanticTransformIds, selectTab, showBottomDrawer]
  );
  const openOutputExpression = useCallback<GraphNodeColumnInspect>(
    ({ nodeId, fieldId, anchorElement }) => {
      if (!semanticTransformIds.has(nodeId)) return;
      if (pendingTabFocus.current != null) cancelAnimationFrame(pendingTabFocus.current);
      opener.current = anchorElement;
      setFocus({ nodeId, fieldId });
      selectTab('semantic');
      showBottomDrawer(360);
    },
    [semanticTransformIds, selectTab, showBottomDrawer]
  );
  const closeOutputExpression = useCallback(() => {
    setFocus((current) => (current == null ? null : { nodeId: current.nodeId }));
    const element = opener.current;
    window.requestAnimationFrame(
      () => element?.isConnected && element.focus({ preventScroll: true })
    );
  }, []);
  return {
    semanticTransform,
    semanticTransformIds,
    openSemanticTransform,
    outputFieldId: focus?.fieldId,
    openOutputExpression,
    closeOutputExpression,
  };
}
