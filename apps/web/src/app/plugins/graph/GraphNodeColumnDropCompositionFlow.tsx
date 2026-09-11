/** Owned concern: convert one centre field drop into an explicit proposal. */
import { useState, type ReactElement } from 'react';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type {
  GraphNodeColumn,
  GraphNodeColumnCompositionFunctionResolver,
  GraphNodeColumnFunction,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeColumnFunctionApplyResult,
  GraphNodeStructuredFieldIdentity,
} from './graphNodeColumnContracts';
import { GraphNodeColumnCompositionMenu } from './GraphNodeColumnCompositionMenu';
import { GraphNodeExpressionComposer } from './GraphNodeExpressionComposer';
import type { GraphNodeColumnCopy } from './GraphNodeColumnPiece';
import { GraphNodeStructuredFieldForm } from './GraphNodeStructuredFieldForm';
import { resolveGraphNodeStructuredFieldCopy } from './graphNodeStructuredFieldCopy';

type PendingExpression = Readonly<{
  functions: readonly GraphNodeColumnFunction[];
  capabilityId: string;
  operandFieldIds: readonly [string, string];
}>;

export function GraphNodeColumnDropCompositionFlow(props: {
  nodeId: string;
  targetColumn: GraphNodeColumn;
  request?: Readonly<{ sourceColumn: GraphNodeColumn; targetColumn: GraphNodeColumn }>;
  operandCandidates: readonly GraphNodeColumn[];
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
  const [pendingExpression, setPendingExpression] = useState<PendingExpression | null>(null);
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
        ).filter(
          (item) =>
            item.minimumArgumentCount <= 2 &&
            (item.maximumArgumentCount == null || item.maximumArgumentCount >= 2)
        );
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
            const selected = compatibleFunctions.find((item) => item.capabilityId === capabilityId);
            const targetFieldId = request.targetColumn.id ?? request.targetColumn.name;
            const sourceFieldId = request.sourceColumn.id ?? request.sourceColumn.name;
            if (selected != null) {
              setPendingExpression({
                functions: compatibleFunctions,
                capabilityId,
                operandFieldIds: [targetFieldId, sourceFieldId],
              });
            }
            props.onDismiss();
          }}
        />
      )}
      {pendingExpression == null || props.onFunctionApply == null ? null : (
        <GraphNodeExpressionComposer
          key={pendingExpression.capabilityId + ':' + pendingExpression.operandFieldIds.join(':')}
          nodeId={props.nodeId}
          columnId={props.targetColumn.id ?? props.targetColumn.name}
          functions={pendingExpression.functions}
          initialCapabilityId={pendingExpression.capabilityId}
          initialOperandFieldIds={pendingExpression.operandFieldIds}
          operandCandidates={props.operandCandidates}
          resolveCompositionFunctions={props.resolveCompositionFunctions}
          unavailableAliases={props.unavailableNames}
          copy={props.copy}
          onCancel={() => setPendingExpression(null)}
          onApply={props.onFunctionApply}
          onApplied={props.onFunctionApplied}
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
