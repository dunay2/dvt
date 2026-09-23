/** Compose the contextual actions around a column piece without owning draft state. */
import type { ReactElement } from 'react';
import { Tooltip, TooltipTrigger } from '../../components/ui/tooltip';
import type { GraphNodeColumn, GraphNodeColumnSectionProps } from './graphNodeColumnContracts';
import type { GraphNodeColumnCopy } from './GraphNodeColumnPiece';
import { GraphNodeColumnFunctionMenu } from './GraphNodeColumnFunctionMenu';

type Props = Pick<
  GraphNodeColumnSectionProps,
  'onStructuredFieldApply' | 'onColumnOutputToggle'
> & {
  column: GraphNodeColumn;
  nodeId?: string;
  copy: GraphNodeColumnCopy;
  appendCandidates: readonly GraphNodeColumn[];
  keyboardOpen: boolean;
  onKeyboardOpenChange: (open: boolean) => void;
  onRequest?: (capabilityId: string) => void;
  onCreateAlias?: () => void;
  piece: ReactElement;
  tooltip: ReactElement;
};

export function GraphNodeColumnActions(props: Props): ReactElement {
  const { column, nodeId } = props;
  if (nodeId == null)
    return (
      <Tooltip>
        <TooltipTrigger asChild>{props.piece}</TooltipTrigger>
        {props.tooltip}
      </Tooltip>
    );
  const columnId = column.id ?? column.name;
  return (
    <GraphNodeColumnFunctionMenu
      nodeId={nodeId}
      columnId={columnId}
      menu={column.functionMenu}
      columnName={column.name}
      appendCandidates={props.appendCandidates}
      copy={props.copy}
      keyboardOpen={props.keyboardOpen}
      onKeyboardOpenChange={props.onKeyboardOpenChange}
      onCreateAlias={props.onCreateAlias}
      onRequest={props.onRequest}
      onStructuredAppend={
        column.children == null || props.onStructuredFieldApply == null
          ? undefined
          : (candidate) =>
              props.onStructuredFieldApply?.({
                nodeId,
                draggedFieldId: candidate.id ?? candidate.name,
                targetFieldId: columnId,
                parentName: column.name,
              })
      }
      onStructuredRemove={
        column.children == null || props.onColumnOutputToggle == null
          ? undefined
          : () =>
              props.onColumnOutputToggle?.({
                nodeId,
                columnId,
                columnType: column.type,
                output: false,
              })
      }
      piece={props.piece}
      tooltip={props.tooltip}
    />
  );
}
