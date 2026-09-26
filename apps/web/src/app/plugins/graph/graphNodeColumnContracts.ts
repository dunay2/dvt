/** Owned concern: define graph-node column presentation and interaction contracts. */
import type { DvtSubstraitProjectionAuthoringRejection } from '../../views/canvas/canvasDvtSubstraitProjection';
import type { GraphNodeColumnInspect } from './graphColumnInspection';
import type { ActiveColumnPlacement } from './useGraphNodeColumnOrder';

export type GraphNodeColumnFunction = Readonly<{
  capabilityId: string;
  name: string;
  minimumArgumentCount: number;
  maximumArgumentCount?: number;
  expressionTemplate?: string;
}>;

export type GraphNodeColumn = Readonly<{
  id?: string;
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  output?: boolean;
  outputToggleDisabled?: boolean;
  sourceNodeName?: string;
  sourceFieldName?: string;
  sourceReference?: string;
  source?: Readonly<{ nodeId: string; columnId: string }>;
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

export type GraphNodeColumnCompositionFunctionResolver = (
  args: Readonly<{
    targetType: string;
    sourceType: string;
  }>
) => readonly GraphNodeColumnFunction[];

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
  source?: Readonly<{ nodeId: string; columnId: string }>;
  placement?: ActiveColumnPlacement;
}>;
export type GraphNodeColumnFunctionApplyIdentity = Readonly<{
  nodeId: string;
  columnId: string;
  capabilityId: string;
  alias: string;
  operandFieldIds: readonly [string, ...string[]];
}>;
export type GraphNodeColumnFunctionApplyResult =
  | Readonly<{ outcome: 'applied'; createdFieldId: string }>
  | Readonly<{ outcome: 'rejected'; reason: DvtSubstraitProjectionAuthoringRejection }>;
export type GraphNodeStructuredFieldIdentity = Readonly<{
  nodeId: string;
  draggedFieldId: string;
  targetFieldId: string;
  parentName: string;
}>;
export type GraphNodeCalculatedColumnIdentity =
  | Readonly<{ nodeId: string; kind: 'field-ref'; alias: string; inputFieldId: string }>
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
  onColumnInspect?: GraphNodeColumnInspect;
  columns: readonly GraphNodeColumn[];
  inputColumns?: readonly GraphNodeColumn[];
  view?: 'input' | 'output';
  showSourceName?: boolean;
  expressionInputs?: readonly GraphNodeColumn[];
  expanded?: boolean;
  nodeId?: string;
  portDirections?: readonly GraphNodeColumnPortDirection[];
  activeColumnHandleId?: string | null;
  onColumnPortActivate?: (identity: GraphNodeColumnPortIdentity) => void;
  onColumnFunctionApply?: (
    identity: GraphNodeColumnFunctionApplyIdentity
  ) => GraphNodeColumnFunctionApplyResult;
  resolveColumnCompositionFunctions?: GraphNodeColumnCompositionFunctionResolver;
  onStructuredFieldApply?: (
    identity: GraphNodeStructuredFieldIdentity
  ) => GraphNodeColumnFunctionApplyResult;
  onCalculatedColumnAdd?: (
    identity: GraphNodeCalculatedColumnIdentity
  ) => GraphNodeColumnFunctionApplyResult;
  onColumnOutputToggle?: (identity: GraphNodeColumnOutputToggleIdentity) => void;
  onColumnReorder?: (identity: GraphNodeColumnReorderIdentity) => void;
  onDisclosureChange?: (expanded: boolean) => void;
  onColumnLayoutChange?: () => void;
  onAutomap?: () => void;
}>;
