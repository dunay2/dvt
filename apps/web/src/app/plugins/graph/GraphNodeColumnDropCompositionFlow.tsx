/** Owned concern: convert one centre field drop into an explicit proposal. */
import { useState, type ReactElement } from 'react';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type {
  GraphNodeColumn,
  GraphNodeColumnFunctionApplyResult,
  GraphNodeStructuredFieldIdentity,
} from './graphNodeColumnContracts';
import { GraphNodeColumnCompositionMenu } from './GraphNodeColumnCompositionMenu';
import { GraphNodeStructuredFieldForm } from './GraphNodeStructuredFieldForm';
import { resolveGraphNodeStructuredFieldCopy } from './graphNodeStructuredFieldCopy';

export function GraphNodeColumnDropCompositionFlow(props: {
  nodeId: string;
  request?: Readonly<{ sourceColumn: GraphNodeColumn; targetColumn: GraphNodeColumn }>;
  unavailableNames: readonly string[];
  onDismiss: () => void;
  onFunctionApplied?: (createdFieldId: string) => void;
  onStructuredFieldApply?: (
    identity: GraphNodeStructuredFieldIdentity
  ) => GraphNodeColumnFunctionApplyResult;
}): ReactElement | null {
  const language = useApplicationLanguageStore((state) => state.language);
  const structuredCopy = resolveGraphNodeStructuredFieldCopy(language);
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
          structuredFieldLabel={structuredCopy.action}
          onOpenChange={(open) => !open && props.onDismiss()}
          onStructuredRequest={() => {
            setStructuredChildren([request.targetColumn, request.sourceColumn]);
            props.onDismiss();
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
          onApply={(parentName) =>
            props.onStructuredFieldApply!({
              nodeId: props.nodeId,
              draggedFieldId: structuredChildren[1].id ?? structuredChildren[1].name,
              targetFieldId: structuredChildren[0].id ?? structuredChildren[0].name,
              parentName,
            })
          }
          onApplied={(createdFieldId) => {
            setStructuredChildren(null);
            props.onFunctionApplied?.(createdFieldId);
          }}
        />
      )}
    </>
  );
}
