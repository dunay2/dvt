/** Legacy card gesture hosted by the canonical derived-output command form. */
import { type ReactElement } from 'react';
import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { Popover, PopoverAnchor, PopoverContent } from '../../components/ui/popover';
import {
  DerivedOutputForm,
  type DerivedOutputFunction,
  type DerivedOutputFunctionResolver,
} from '../../views/canvas/DerivedOutputForm';
import type {
  GraphNodeColumn,
  GraphNodeColumnCompositionFunctionResolver,
  GraphNodeColumnFunctionApplyIdentity,
  GraphNodeColumnFunctionApplyResult,
} from './graphNodeColumnContracts';
import type { GraphNodeColumnCopy } from './GraphNodeColumnPiece';
import { graphNodeColumnClasses } from './graphVisualTokens';

type Rejection = Extract<GraphNodeColumnFunctionApplyResult, { outcome: 'rejected' }>['reason'];

function rejectionLabel(reason: Rejection, copy: GraphNodeColumnCopy): string {
  if (reason === 'invalid_alias') return copy.columnFunctionAliasPolicyErrorLabel;
  if (reason === 'duplicate_alias') return copy.columnFunctionAliasConflictLabel;
  if (reason === 'invalid_literal') return copy.calculatedColumnLiteralPolicyError;
  if (reason === 'unsupported_capability') return copy.noCompatibleColumnFunctionsLabel;
  if (reason === 'invalid_reference') return copy.columnAuthoringInvalidReferenceLabel;
  if (reason === 'invalid_target') return copy.noColumnActionsLabel;
  return copy.expressionComposerRejectedLabel;
}

function createResolver(
  functions: readonly DerivedOutputFunction[],
  fields: readonly GraphNodeColumn[],
  composition?: GraphNodeColumnCompositionFunctionResolver
): DerivedOutputFunctionResolver {
  return (fieldIds, resolution) => {
    if (resolution === 'proposal' || fieldIds.length <= 1) return functions;
    const first = fields.find((field) => (field.id ?? field.name) === fieldIds[0]);
    if (first == null) return [];
    return functions.filter((operation) => {
      if (
        operation.minimumArgumentCount > fieldIds.length ||
        (operation.maximumArgumentCount != null && operation.maximumArgumentCount < fieldIds.length)
      )
        return false;
      return fieldIds.slice(1).every((fieldId) => {
        const field = fields.find((candidate) => (candidate.id ?? candidate.name) === fieldId);
        return (
          field != null &&
          (composition?.({ targetType: first.type, sourceType: field.type }).some(
            (candidate) => candidate.capabilityId === operation.capabilityId
          ) ??
            true)
        );
      });
    });
  };
}

export type GraphNodeExpressionComposerFunction = DerivedOutputFunction;

export function GraphNodeExpressionComposer(props: {
  nodeId: string;
  columnId: string;
  functions: readonly GraphNodeExpressionComposerFunction[];
  initialCapabilityId: string;
  initialOperandFieldIds: readonly [string, ...string[]];
  operandCandidates: readonly GraphNodeColumn[];
  resolveCompositionFunctions?: GraphNodeColumnCompositionFunctionResolver;
  unavailableAliases: readonly string[];
  copy: GraphNodeColumnCopy;
  onApply: (identity: GraphNodeColumnFunctionApplyIdentity) => GraphNodeColumnFunctionApplyResult;
  onApplied?: (createdFieldId: string) => void;
  onCancel: () => void;
}): ReactElement {
  const resolver = createResolver(
    props.functions,
    props.operandCandidates,
    props.resolveCompositionFunctions
  );
  return (
    <Popover open>
      <PopoverAnchor asChild>
        <span className={graphNodeColumnClasses.expressionComposerAnchor} />
      </PopoverAnchor>
      <PopoverContent
        data-slot="graph-node-expression-composer"
        {...canvasNodeEmbeddedControlProps}
        side="right"
        align="center"
        className={graphNodeColumnClasses.expressionComposer}
        onEscapeKeyDown={props.onCancel}
        onPointerDownOutside={props.onCancel}
      >
        <DerivedOutputForm
          fields={props.operandCandidates.map((field) => ({
            fieldId: field.id ?? field.name,
            name: field.name,
            dataType: field.type,
          }))}
          resolveFunctions={resolver}
          initialCapabilityId={props.initialCapabilityId}
          initialOperandFieldIds={props.initialOperandFieldIds}
          unavailableAliases={props.unavailableAliases}
          copy={{
            functionLabel: props.copy.expressionComposerFunctionLabel,
            operandsLabel: props.copy.expressionComposerOperandsLabel,
            addOperand: props.copy.expressionComposerAddOperandLabel,
            removeOperand: props.copy.expressionComposerRemoveOperandLabelTemplate,
            moveOperandUp: props.copy.expressionComposerMoveOperandUpLabelTemplate,
            moveOperandDown: props.copy.expressionComposerMoveOperandDownLabelTemplate,
            previewLabel: props.copy.expressionComposerPreviewLabel,
            aliasLabel: props.copy.columnFunctionAliasLabelTemplate.replace('{function}', ''),
            aliasInvalid: props.copy.columnFunctionAliasPolicyErrorLabel,
            aliasConflict: props.copy.columnFunctionAliasConflictLabel,
            cancel: props.copy.columnFunctionAliasCancelLabel,
            save: props.copy.columnFunctionAliasSubmitLabel,
          }}
          onCancel={props.onCancel}
          onSubmit={(request) => {
            const result = props.onApply({
              ...request,
              nodeId: props.nodeId,
              columnId: props.columnId,
            });
            if (result.outcome === 'rejected') return rejectionLabel(result.reason, props.copy);
            props.onApplied?.(result.createdFieldId);
            return null;
          }}
          onApplied={props.onCancel}
        />
      </PopoverContent>
    </Popover>
  );
}
