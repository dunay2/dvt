/** Owned concern: convert one centre field drop into an explicit proposal. */
import { useState, type ReactElement } from 'react';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type {
  GraphNodeColumn,
  GraphNodeColumnCompositionFunctionResolver,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeColumnFunctionApplyResult,
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
  operandFieldIds: readonly [string, string];
  operandNames: readonly [string, string];
}>;

export function GraphNodeColumnDropCompositionFlow(props: {
  nodeId: string;
  targetColumn: GraphNodeColumn;
  request?: Readonly<{ sourceColumn: GraphNodeColumn; targetColumn: GraphNodeColumn }>;
  unavailableNames: readonly string[];
  copy: GraphNodeColumnCopy;
  onDismiss: () => void;
  resolveCompositionFunctions?: GraphNodeColumnCompositionFunctionResolver;
  onFunctionApply?: (
    identity: GraphNodeColumnFunctionApplyIdentity
  ) => GraphNodeColumnFunctionApplyResult;
  onFunctionApplied?: (createdFieldId: string) => void;
  onStructuredFieldApply?: (identity: GraphNodeStructuredFieldIdentity) => void;
}): ReactElement | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const structuredCopy = resolveGraphNodeStructuredFieldCopy(language);
  const [pendingFunction, setPendingFunction] = useState<PendingFunction | null>(null);
  const [structuredChildren, setStructuredChildren] = useState<
    readonly [GraphNodeColumn, GraphNodeColumn] | null
  >(null);
  const request = props.request;
  const compatibleFunctions =
    request == null
      ? []
      : (
          props.resolveCompositionFunctions?.({
            targetType: request.targetColumn.type,
            sourceType: request.sourceColumn.type,
          }) ?? []
        ).filter((item) => item.argumentCount === 2);
  return (
    <>
      {request == null ? null : (
        <GraphNodeColumnCompositionMenu
          sourceColumn={request.sourceColumn}
          targetColumn={request.targetColumn}
          copy={props.copy}
          compatibleFunctions={compatibleFunctions}
          structuredFieldLabel={structuredCopy.action}
          onOpenChange={(open) => !open && props.onDismiss()}
          onStructuredRequest={() => {
            setStructuredChildren([request.targetColumn, request.sourceColumn]);
            props.onDismiss();
          }}
          onRequest={(capabilityId) => {
            const selected = compatibleFunctions.find(
              (item) => item.capabilityId === capabilityId && item.argumentCount === 2
            );
            const targetFieldId = request.targetColumn.id ?? request.targetColumn.name;
            const sourceFieldId = request.sourceColumn.id ?? request.sourceColumn.name;
            if (selected != null) {
              setPendingFunction({
                capabilityId,
                functionName: selected.name,
                operandFieldIds: [targetFieldId, sourceFieldId],
                operandNames: [request.targetColumn.name, request.sourceColumn.name],
              });
            }
            props.onDismiss();
          }}
        />
      )}
      {pendingFunction == null || props.onFunctionApply == null ? null : (
        <GraphNodeColumnFunctionAliasForm
          functionName={pendingFunction.functionName}
          expressionLabel={[
            pendingFunction.functionName.toUpperCase(),
            '(',
            pendingFunction.operandNames.join(', '),
            ')',
          ].join('')}
          unavailableAliases={props.unavailableNames}
          copy={props.copy}
          onCancel={() => setPendingFunction(null)}
          onSubmit={(alias) => {
            const result = props.onFunctionApply?.({
              nodeId: props.nodeId,
              columnId: props.targetColumn.id ?? props.targetColumn.name,
              operandFieldIds: pendingFunction.operandFieldIds,
              capabilityId: pendingFunction.capabilityId,
              alias,
            });
            if (result?.outcome === 'applied') {
              props.onFunctionApplied?.(result.createdFieldId);
              setPendingFunction(null);
            }
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
