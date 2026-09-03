/** Owned concern: convert one centre field drop into an explicit proposal. */
import { useState, type ReactElement } from 'react';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type {
  GraphNodeColumn,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeStructuredFieldIdentity,
} from './graphNodeColumnContracts';
import { GraphNodeColumnCompositionMenu } from './GraphNodeColumnCompositionMenu';
import { GraphNodeColumnFunctionAliasForm } from './GraphNodeColumnFunctionAliasForm';
import type { GraphNodeColumnCopy } from './GraphNodeColumnPiece';
import { GraphNodeStructuredFieldForm } from './GraphNodeStructuredFieldForm';
import { resolveGraphNodeStructuredFieldCopy } from './graphNodeStructuredFieldCopy';

type PendingFunction = Readonly<{
  capabilityId: string;
  functionName: string;
  sourceColumnId: string;
}>;

export function GraphNodeColumnDropCompositionFlow(props: {
  nodeId: string;
  targetColumn: GraphNodeColumn;
  request?: Readonly<{ sourceColumn: GraphNodeColumn; targetColumn: GraphNodeColumn }>;
  unavailableNames: readonly string[];
  copy: GraphNodeColumnCopy;
  onDismiss: () => void;
  onFunctionApply?: (identity: GraphNodeColumnFunctionApplyIdentity) => void;
  onStructuredFieldApply?: (identity: GraphNodeStructuredFieldIdentity) => void;
}): ReactElement | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const structuredCopy = resolveGraphNodeStructuredFieldCopy(language);
  const [pendingFunction, setPendingFunction] = useState<PendingFunction | null>(null);
  const [structuredChildren, setStructuredChildren] = useState<
    readonly [GraphNodeColumn, GraphNodeColumn] | null
  >(null);
  const request = props.request;
  return (
    <>
      {request == null ? null : (
        <GraphNodeColumnCompositionMenu
          sourceColumn={request.sourceColumn}
          targetColumn={request.targetColumn}
          copy={props.copy}
          structuredFieldLabel={structuredCopy.action}
          onOpenChange={(open) => !open && props.onDismiss()}
          onStructuredRequest={() => {
            setStructuredChildren([request.targetColumn, request.sourceColumn]);
            props.onDismiss();
          }}
          onRequest={(capabilityId) => {
            const selected = request.sourceColumn.functionMenu?.items.find(
              (item) => item.capabilityId === capabilityId
            );
            const sourceColumnId = request.sourceColumn.id ?? request.sourceColumn.name;
            if (selected != null)
              setPendingFunction({ capabilityId, functionName: selected.name, sourceColumnId });
            props.onDismiss();
          }}
        />
      )}
      {pendingFunction == null || props.onFunctionApply == null ? null : (
        <GraphNodeColumnFunctionAliasForm
          functionName={pendingFunction.functionName}
          unavailableAliases={props.unavailableNames}
          copy={props.copy}
          onCancel={() => setPendingFunction(null)}
          onSubmit={(alias) => {
            props.onFunctionApply?.({
              nodeId: props.nodeId,
              columnId: props.targetColumn.id ?? props.targetColumn.name,
              sourceColumnId: pendingFunction.sourceColumnId,
              capabilityId: pendingFunction.capabilityId,
              alias,
            });
            setPendingFunction(null);
          }}
        />
      )}
      {structuredChildren == null || props.onStructuredFieldApply == null ? null : (
        <GraphNodeStructuredFieldForm
          language={language}
          childNames={[
            ...(structuredChildren[0].children?.map((child) => child.name) ?? [
              structuredChildren[0].name,
            ]),
            structuredChildren[1].name,
          ]}
          unavailableNames={props.unavailableNames}
          initialName={
            structuredChildren[0].children == null ? undefined : structuredChildren[0].name
          }
          allowedExistingName={
            structuredChildren[0].children == null ? undefined : structuredChildren[0].name
          }
          onCancel={() => setStructuredChildren(null)}
          onApply={(parentName) => {
            props.onStructuredFieldApply?.({
              nodeId: props.nodeId,
              draggedFieldId: structuredChildren[1].id ?? structuredChildren[1].name,
              targetFieldId: structuredChildren[0].id ?? structuredChildren[0].name,
              parentName,
            });
            setStructuredChildren(null);
          }}
        />
      )}
    </>
  );
}
