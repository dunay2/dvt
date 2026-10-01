/** Adapt graph interaction data into the shared column-section DTO. */
import type { GraphNodeColumnInspect } from './graphColumnInspection';
import type {
  GraphNodeColumn,
  GraphNodeInputMapping,
  GraphNodeColumnPortDirection,
  GraphNodeColumnPortIdentity,
  GraphNodeColumnFunctionApplyResult,
  GraphNodeStructuredFieldIdentity,
  GraphNodeCalculatedColumnIdentity,
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
} from './graphNodeColumnContracts';

export function resolveGraphNodeColumnInteractionProps(args: {
  nodeId: string;
  nodeRole: string;
  data: Record<string, unknown>;
}) {
  const { data } = args;
  return {
    onColumnInspect:
      args.nodeRole === 'transform' && typeof data.onInspectCanvasColumn === 'function'
        ? (data.onInspectCanvasColumn as GraphNodeColumnInspect)
        : undefined,
    nodeId: args.nodeId,
    view:
      data.columnView === 'input'
        ? ('input' as const)
        : data.columnView === 'output'
          ? ('output' as const)
          : undefined,
    onViewChange:
      typeof data.onColumnViewChange === 'function'
        ? (view: 'input' | 'output') =>
            (data.onColumnViewChange as (nodeId: string, view: 'input' | 'output') => void)(
              args.nodeId,
              view
            )
        : undefined,
    onInputMapping:
      args.nodeRole === 'transform' && typeof data.onMapCanvasInput === 'function'
        ? (data.onMapCanvasInput as (identity: GraphNodeInputMapping) => void)
        : undefined,
    inputColumns:
      args.nodeRole === 'transform' && Array.isArray(data.inputColumns)
        ? (data.inputColumns as readonly GraphNodeColumn[])
        : undefined,
    columnPortDirections: Array.isArray(data.columnPortDirections)
      ? (data.columnPortDirections as readonly GraphNodeColumnPortDirection[])
      : [],
    activeColumnHandleId:
      typeof data.activeColumnHandleId === 'string' ? data.activeColumnHandleId : null,
    columnDisclosureExpanded:
      typeof data.columnDisclosureExpanded === 'boolean'
        ? data.columnDisclosureExpanded
        : undefined,
    expressionInputs: Array.isArray(data.expressionInputColumns)
      ? (data.expressionInputColumns as readonly GraphNodeColumn[])
      : [],
    onColumnPortActivate:
      typeof data.onColumnPortActivate === 'function'
        ? (data.onColumnPortActivate as (identity: GraphNodeColumnPortIdentity) => void)
        : undefined,
    onStructuredFieldApply:
      args.nodeRole === 'transform' && typeof data.onApplyCanvasStructuredField === 'function'
        ? (data.onApplyCanvasStructuredField as (
            identity: GraphNodeStructuredFieldIdentity
          ) => GraphNodeColumnFunctionApplyResult)
        : undefined,
    onCalculatedColumnAdd:
      typeof data.onAddCanvasCalculatedColumn === 'function'
        ? (data.onAddCanvasCalculatedColumn as (
            identity: GraphNodeCalculatedColumnIdentity
          ) => GraphNodeColumnFunctionApplyResult | Promise<GraphNodeColumnFunctionApplyResult>)
        : undefined,
    onColumnOutputToggle:
      (args.nodeRole === 'input' || args.nodeRole === 'transform') &&
      typeof data.onToggleCanvasColumnOutput === 'function'
        ? (data.onToggleCanvasColumnOutput as (
            identity: GraphNodeColumnOutputToggleIdentity
          ) => GraphNodeColumnFunctionApplyResult)
        : undefined,
    onColumnReorder:
      (args.nodeRole === 'input' || args.nodeRole === 'transform') &&
      typeof data.onReorderCanvasColumnOutput === 'function'
        ? (data.onReorderCanvasColumnOutput as (identity: GraphNodeColumnReorderIdentity) => void)
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
