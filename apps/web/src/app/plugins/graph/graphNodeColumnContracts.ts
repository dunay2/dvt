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
  sourceFieldName?: string;
  reference?: string;
  operations?: readonly string[];
  description?: string;
  sourceHandleId?: string;
  targetHandleId?: string;
  children?: readonly GraphNodeColumn[];
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
  parentColumnId?: string;
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
export type GraphNodeStructuredFieldIdentity = Readonly<{
  nodeId: string;
  draggedFieldId: string;
  targetFieldId: string;
  parentName: string;
}>;
export type GraphNodeCalculatedColumnIdentity =
  | Readonly<{ nodeId: string; kind: 'string-literal'; alias: string; value: string }>
  | Readonly<{ nodeId: string; kind: 'timestamp-literal'; alias: string; value: string }>
  | Readonly<{
      nodeId: string;
      kind: 'scalar-function';
      alias: string;
      inputFieldId: string;
      capabilityId: string;
    }>
  | Readonly<{
      nodeId: string;
      kind: 'row-number';
      alias: string;
      orderFieldId: string;
    }>;

export type GraphNodeColumnSectionProps = Readonly<{
  columns: readonly GraphNodeColumn[];
  expanded?: boolean;
  nodeId?: string;
  portDirections?: readonly GraphNodeColumnPortDirection[];
  activeColumnHandleId?: string | null;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onColumnFunctionApply?: (identity: GraphNodeColumnFunctionApplyIdentity) => void;
  onStructuredFieldApply?: (identity: GraphNodeStructuredFieldIdentity) => void;
  onCalculatedColumnAdd?: (identity: GraphNodeCalculatedColumnIdentity) => void;
  onColumnOutputToggle?: (identity: GraphNodeColumnOutputToggleIdentity) => void;
  onColumnReorder?: (identity: GraphNodeColumnReorderIdentity) => void;
  canReorderTopLevelColumns?: boolean;
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
    columnDisclosureExpanded:
      typeof data.columnDisclosureExpanded === 'boolean'
        ? data.columnDisclosureExpanded
        : undefined,
    onColumnPortActivate:
      typeof data.onColumnPortActivate === 'function'
        ? (data.onColumnPortActivate as (identity: GraphNodeColumnPortIdentity) => void)
        : undefined,
    onColumnFunctionApply:
      args.nodeRole === 'transform' && typeof data.onApplyCanvasColumnFunction === 'function'
        ? (data.onApplyCanvasColumnFunction as (
            identity: GraphNodeColumnFunctionApplyIdentity
          ) => void)
        : undefined,
    onStructuredFieldApply:
      args.nodeRole === 'transform' && typeof data.onApplyCanvasStructuredField === 'function'
        ? (data.onApplyCanvasStructuredField as (
            identity: GraphNodeStructuredFieldIdentity
          ) => void)
        : undefined,
    onCalculatedColumnAdd:
      typeof data.onAddCanvasCalculatedColumn === 'function'
        ? (data.onAddCanvasCalculatedColumn as (
            identity: GraphNodeCalculatedColumnIdentity
          ) => void)
        : undefined,
    onColumnOutputToggle:
      args.nodeRole === 'transform' && typeof data.onToggleCanvasColumnOutput === 'function'
        ? (data.onToggleCanvasColumnOutput as (
            identity: GraphNodeColumnOutputToggleIdentity
          ) => void)
        : undefined,
    onColumnReorder:
      (args.nodeRole === 'input' || args.nodeRole === 'transform') &&
      typeof data.onReorderCanvasColumnOutput === 'function'
        ? (data.onReorderCanvasColumnOutput as (identity: GraphNodeColumnReorderIdentity) => void)
        : undefined,
    canReorderTopLevelColumns: data.canReorderTopLevelColumns !== false,
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
