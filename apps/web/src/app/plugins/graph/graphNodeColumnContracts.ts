/** Owned concern: define graph-node column presentation and interaction contracts. */
import type { ActiveColumnPlacement } from './useGraphNodeColumnOrder';

export type GraphNodeColumnFunction = Readonly<{
  capabilityId: string;
  name: string;
}>;

export type GraphNodeColumn = Readonly<{
  id?: string;
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  output?: boolean;
  sourceNodeName?: string;
  reference?: string;
  sourceHandleId?: string;
  targetHandleId?: string;
  functionMenu?: Readonly<{
    category: 'text' | 'numeric' | 'date-time' | 'conversion' | 'aggregate' | 'window';
    items: readonly GraphNodeColumnFunction[];
  }>;
}>;

export type GraphNodeColumnPortDirection = 'source' | 'target';
export type GraphNodeColumnPortIdentity = Readonly<{
  direction: GraphNodeColumnPortDirection;
  nodeId: string;
  columnId: string;
}>;
export type GraphNodeColumnReorderIdentity = Readonly<{
  nodeId: string;
  columnId: string;
  targetColumnId: string;
  placement: 'before' | 'after';
}>;
export type GraphNodeColumnOutputToggleIdentity = Readonly<{
  nodeId: string;
  columnId: string;
  columnType: string;
  output: boolean;
  placement?: ActiveColumnPlacement;
}>;
export type GraphNodeColumnFunctionApplyIdentity = Readonly<{
  nodeId: string;
  columnId: string;
  capabilityId: string;
  alias: string;
  sourceColumnId?: string;
}>;

export type GraphNodeColumnSectionProps = Readonly<{
  columns: readonly GraphNodeColumn[];
  nodeId?: string;
  portDirections?: readonly GraphNodeColumnPortDirection[];
  activeColumnHandleId?: string | null;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onColumnFunctionApply?: (identity: GraphNodeColumnFunctionApplyIdentity) => void;
  onColumnOutputToggle?: (identity: GraphNodeColumnOutputToggleIdentity) => void;
  onColumnReorder?: (identity: GraphNodeColumnReorderIdentity) => void;
  onDisclosureChange?: (expanded: boolean) => void;
  onColumnLayoutChange?: () => void;
  onAutomap?: () => void;
}>;

export function resolveGraphNodeColumnInteractionProps(args: {
  nodeId: string;
  nodeRole: string;
  data: Record<string, unknown>;
}) {
  const { data } = args;
  return {
    nodeId: args.nodeId,
    columnPortDirections: Array.isArray(data.columnPortDirections)
      ? (data.columnPortDirections as readonly GraphNodeColumnPortDirection[])
      : [],
    activeColumnHandleId:
      typeof data.activeColumnHandleId === 'string' ? data.activeColumnHandleId : null,
    onColumnPortActivate:
      typeof data.onColumnPortActivate === 'function'
        ? (data.onColumnPortActivate as (identity: GraphNodeColumnPortIdentity) => void)
        : undefined,
    onColumnFunctionApply:
      args.nodeRole === 'transform' && typeof data.onApplyDvtSubstraitColumnFunction === 'function'
        ? (data.onApplyDvtSubstraitColumnFunction as (
            identity: GraphNodeColumnFunctionApplyIdentity
          ) => void)
        : undefined,
    onColumnOutputToggle:
      args.nodeRole === 'transform' && typeof data.onToggleCanvasColumnOutput === 'function'
        ? (data.onToggleCanvasColumnOutput as (
            identity: GraphNodeColumnOutputToggleIdentity
          ) => void)
        : undefined,
    onColumnReorder:
      args.nodeRole === 'transform' && typeof data.onReorderDvtSubstraitColumnOutput === 'function'
        ? (data.onReorderDvtSubstraitColumnOutput as (
            identity: GraphNodeColumnReorderIdentity
          ) => void)
        : undefined,
    onColumnDisclosureChange:
      typeof data.onColumnDisclosureChange === 'function'
        ? (data.onColumnDisclosureChange as (nodeId: string, expanded: boolean) => void)
        : undefined,
    onColumnLayoutChange:
      typeof data.onColumnLayoutChange === 'function'
        ? (data.onColumnLayoutChange as () => void)
        : undefined,
    onAutomapColumns:
      args.nodeRole === 'transform' && typeof data.onAutomapColumns === 'function'
        ? (data.onAutomapColumns as (nodeId: string, columns: readonly GraphNodeColumn[]) => void)
        : undefined,
  };
}
