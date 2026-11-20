/**
 * Owned concern: project one placed card's layout preference into Properties and the graph.
 * Corner: a file reference keeps its placement identity even while Properties describes its definition.
 */
import { useMemo } from 'react';
import { InspectorPropertyField } from '../../components/inspector/InspectorPropertyField';
import { Switch } from '../../components/ui/switch';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import { useSessionStore } from '../../stores/sessionStore';
import { getGraphNodeCardStrategies } from '../../plugins/graphStrategyRegistry';
import {
  buildGraphNodeCardReadModel,
  isRuntimeSummaryMetric,
} from '../../plugins/graph/graphNodeCardReadModel';
import { canvasModelNavigationScopeKey } from './canvasModelNavigationPreference';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';
import type { CanvasShellGraph, CanvasShellPanels } from './canvasShell.types';
import {
  resolveSourceCardAppearance,
  type SourceCardAppearance,
} from '../../types/sourceCardAppearance';
import { SourceCardAppearancePanel } from './SourceCardAppearancePanel';
import { resolveSourceCardAppearanceCopy } from './sourceCardAppearanceCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

const emptyIds: readonly string[] = [];
const emptyAppearances: Readonly<Record<string, SourceCardAppearance>> = {};

export function useCanvasCardPresentation(
  { activeCanvasId, inspectorNode, inspectorTarget, runtimeCapabilities }: CanvasShellPanels,
  nodes: CanvasShellGraph['nodesWithImpact'],
  label: string,
  projectRoot?: string,
  filePlacementLayoutKey?: string
) {
  const appearanceCopy = useApplicationLanguageStore((state) =>
    resolveSourceCardAppearanceCopy(state.language)
  );
  const scopeKey = useSessionStore((scope) =>
    canvasModelNavigationScopeKey(scope, activeCanvasId, projectRoot)
  );
  const ids = useCanvasInteractionStore((state) =>
    scopeKey == null ? emptyIds : (state.canvasLayouts[scopeKey]?.visibleMetricNodeIds ?? emptyIds)
  );
  const setVisible = useCanvasInteractionStore((state) => state.setCanvasCardMetricsVisible);
  const sourceAppearanceByNode = useCanvasInteractionStore((state) =>
    scopeKey == null
      ? emptyAppearances
      : (state.canvasLayouts[scopeKey]?.sourceCardAppearanceByNode ?? emptyAppearances)
  );
  const setAppearance = useCanvasInteractionStore((state) => state.setSourceCardAppearance);
  const visibleMetricNodeIds = useMemo(() => new Set(ids), [ids]);
  const placementId =
    inspectorTarget?.kind === 'canonical-node' && inspectorTarget.nodeId === inspectorNode?.id
      ? (inspectorTarget.placementId ?? inspectorNode.id)
      : inspectorNode?.id;
  const contribution = useMemo((): CanvasNodeWorkbenchContribution | null => {
    if (scopeKey == null || inspectorNode == null || placementId == null) return null;
    const placed = nodes.find((node) => node.id === placementId);
    if (placed == null) return null;
    if (inspectorNode.role === 'input') {
      return {
        id: 'source-card-appearance',
        nodeId: inspectorNode.id,
        sectionId: 'appearance',
        placement: 'before-body',
        content: (
          <SourceCardAppearancePanel
            appearance={resolveSourceCardAppearance(sourceAppearanceByNode[placementId])}
            copy={appearanceCopy}
            onChange={(patch) =>
              setAppearance(scopeKey, placementId, patch, filePlacementLayoutKey)
            }
          />
        ),
      };
    }
    const card = buildGraphNodeCardReadModel(
      inspectorNode,
      placed.data,
      getGraphNodeCardStrategies(runtimeCapabilities)
    );
    if (!card.operationalMetrics.length && !card.metrics.some(isRuntimeSummaryMetric)) return null;
    return {
      id: 'canvas-card-metric-visibility',
      nodeId: inspectorNode.id,
      sectionId: 'general',
      placement: 'after-body',
      content: (
        <InspectorPropertyField label={label} action={null}>
          <Switch
            aria-label={label}
            data-slot="canvas-card-metrics-switch"
            checked={visibleMetricNodeIds.has(placementId)}
            onCheckedChange={(visible) =>
              setVisible(scopeKey, placementId, visible, filePlacementLayoutKey)
            }
          />
        </InspectorPropertyField>
      ),
    };
  }, [
    scopeKey,
    inspectorNode,
    placementId,
    nodes,
    runtimeCapabilities,
    label,
    visibleMetricNodeIds,
    setVisible,
    setAppearance,
    sourceAppearanceByNode,
    appearanceCopy,
    filePlacementLayoutKey,
  ]);
  return { visibleMetricNodeIds, sourceAppearanceByNode, contribution };
}
