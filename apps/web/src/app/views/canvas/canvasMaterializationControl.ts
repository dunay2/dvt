/** Pure DTO projection for the native model-card materialization control. */
import type { CanonicalNode } from '../../types/canonical';
import type { GraphNodeMaterializationControl } from '../../plugins/graph/graphNodeCardStrategyContracts';
import {
  canConfigureNativeMaterialization,
  DVT_TRANSFORM_MATERIALIZATIONS,
  isDvtTransformMaterialization,
} from './canvasDvtMaterializationPolicy';
import { readDvtNodeConfig } from './canvasDvtSourceAuthoring';

type ControlArgs = Readonly<{
  node: CanonicalNode;
  label: string;
  change?: (nodeId: string, value: string) => void;
}>;

export function projectCanvasMaterializationControl({
  node,
  label,
  change,
}: ControlArgs): GraphNodeMaterializationControl | undefined {
  if (!canConfigureNativeMaterialization(node)) return undefined;
  const value = readDvtNodeConfig(node).materialized ?? 'view';
  if (!isDvtTransformMaterialization(value)) return undefined;
  return {
    label,
    value,
    options: DVT_TRANSFORM_MATERIALIZATIONS.map((mode) => ({ value: mode, label: mode })),
    disabled: change == null,
    onChange: (next) => change?.(node.id, next),
  };
}
