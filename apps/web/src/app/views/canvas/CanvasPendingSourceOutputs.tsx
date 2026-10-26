/** Compose pending Source inspection and adapt its intent or configured terminal to shared rows. */
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import { useMemo } from 'react';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  CanvasStagedAnalysisProvider,
  type CanvasStagedAnalysisBinding,
} from './CanvasStagedAnalysisProvider';
import { CanvasSourceOccurrenceOutputs } from './CanvasSourceOccurrenceOutputs';
import { CanvasSourceOccurrenceOutputSelection } from './CanvasSourceOccurrenceOutputSelection';
import {
  pendingSourceOccurrencePublishedFieldIds,
  type PendingSourceOccurrence,
} from './relational-source-occurrence/pendingSourceOccurrence';
import type {
  CanvasRelationalTreeAuthoringDto,
  CanvasRelationalTreeAuthoringActions,
} from './canvasRelationalTreeAuthoringView';
import { PendingSourceOccurrenceProperties } from './relational-source-occurrence/PendingSourceOccurrenceProperties';
import { sourceOccurrenceAliases } from './relational-source-occurrence/sourceOccurrenceAlias';
import {
  decodeCanvasStagedOperation,
  resolveCanvasStagedEditingDocument,
  resolveCanvasStagedProducerDocument,
} from './canvasStagedOperationDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';

export function CanvasPendingSourceInspector({
  data,
  actions,
  occurrence,
  publishedFieldNames,
  onClose,
  onPendingChange,
}: Readonly<{
  data: Pick<
    CanvasRelationalTreeAuthoringDto,
    | 'outputRelationId'
    | 'draft'
    | 'stagedOperations'
    | 'pendingSources'
    | 'inputs'
    | 'analysisBinding'
  >;
  actions: Pick<
    CanvasRelationalTreeAuthoringActions,
    'setPendingOutputIncluded' | 'changeDraft' | 'updateStagedOperation' | 'renamePending'
  >;
  occurrence: PendingSourceOccurrence;
  publishedFieldNames: readonly string[];
  onClose: () => void;
  onPendingChange: (pending: boolean) => void;
}>): JSX.Element {
  const relationId = occurrence.read.binding.relationId;
  const outputDocument = useMemo(() => {
    const containsRead = (document: SubstraitDocument | null): boolean =>
      document?.sidecar.relations.some((binding) => binding.relationId === relationId) ?? false;
    const terminal = resolveCanvasStagedProducerDocument({
      relationId: data.outputRelationId,
      canonical: data.draft,
      operations: data.stagedOperations,
      sources: data.pendingSources,
    });
    if (containsRead(terminal)) return terminal;
    const configured = data.stagedOperations.find((operation) =>
      containsRead(decodeCanvasStagedOperation(operation))
    );
    if (configured != null)
      return resolveCanvasStagedEditingDocument(configured, data.stagedOperations);
    return containsRead(data.draft) ? data.draft : null;
  }, [relationId, data.outputRelationId, data.draft, data.stagedOperations, data.pendingSources]);
  return (
    <PendingSourceOccurrenceProperties
      occurrence={occurrence}
      output={(editing) => (
        <CanvasPendingSourceOutputs
          occurrence={occurrence}
          input={data.inputs.find((input) => input.nodeId === occurrence.sourceNodeId)}
          publishedFieldNames={publishedFieldNames}
          editing={editing}
          document={outputDocument}
          binding={data.analysisBinding}
          onChange={(fieldId, included) => {
            actions.setPendingOutputIncluded(relationId, fieldId, included);
          }}
          onCanonicalChange={(document) => {
            const indexed = indexSubstraitRelations(document);
            if (!indexed.ok) return false;
            const root = data.stagedOperations.find(
              (operation) => operation.id === indexed.index.rootId
            );
            if (root == null) {
              actions.changeDraft(document);
              return;
            }
            return actions.updateStagedOperation(root.id, {
              operation: root.operation,
              semanticDocument: encodeDvtSubstraitSemanticDocument(document),
            });
          }}
        />
      )}
      occupied={
        new Set([
          ...sourceOccurrenceAliases(data.draft?.sidecar.relations ?? []),
          ...data.pendingSources
            .filter((item) => item !== occurrence)
            .map((item) => item.read.binding.displayName),
        ])
      }
      actions={{ rename: (alias) => actions.renamePending(relationId, alias), close: onClose }}
      onPendingChange={onPendingChange}
    />
  );
}

export function CanvasPendingSourceOutputs(
  args: Readonly<{
    occurrence: PendingSourceOccurrence;
    input?: CanvasDvtCompositionInput;
    publishedFieldNames: readonly string[];
    editing: boolean;
    document: SubstraitDocument | null;
    binding: CanvasStagedAnalysisBinding;
    onChange: (fieldId: string, included: boolean) => void;
    onCanonicalChange: (document: SubstraitDocument) => void | boolean;
  }>
): JSX.Element {
  const { occurrence, input, editing, document } = args;
  const relationId = occurrence.read.binding.relationId;
  const indexed = document == null ? null : indexSubstraitRelations(document);
  if (
    occurrence.initialOutputFieldIds == null &&
    indexed?.ok &&
    indexed.index.relations.has(relationId)
  )
    return (
      <CanvasStagedAnalysisProvider
        binding={args.binding}
        document={document}
        scope={`source-output:${relationId}`}
      >
        <CanvasSourceOccurrenceOutputSelection
          relationId={relationId}
          input={input}
          publishedFieldNames={args.publishedFieldNames}
          onChange={editing ? args.onCanonicalChange : undefined}
        />
      </CanvasStagedAnalysisProvider>
    );
  const available = new Set(
    input == null ? [] : pendingSourceOccurrencePublishedFieldIds(occurrence, input)
  );
  const selected = new Set(occurrence.initialOutputFieldIds ?? available);
  const producerIds = new Map(
    occurrence.read.binding.producerRef?.fields.map((mapping) => [
      mapping.fieldId,
      mapping.producerFieldId,
    ])
  );
  const dataTypes = new Map(
    input?.fields.map((field) => [input.sourceRef == null ? field.id : field.name, field.dataType])
  );
  return (
    <CanvasSourceOccurrenceOutputs
      editing={editing}
      disabled={input == null || occurrence.initialOutputFieldIds == null}
      fields={occurrence.read.fields
        .filter((field) => field.parentFieldId == null && available.has(field.fieldId))
        .sort((a, b) => a.outputOrdinal - b.outputOrdinal)
        .map((field) => ({
          id: field.fieldId,
          name: field.displayName ?? field.fieldId,
          dataType: dataTypes.get(
            input?.sourceRef == null ? producerIds.get(field.fieldId) : field.displayName
          ),
          included: selected.has(field.fieldId),
          available: occurrence.initialOutputFieldIds != null,
        }))}
      onChange={args.onChange}
    />
  );
}
