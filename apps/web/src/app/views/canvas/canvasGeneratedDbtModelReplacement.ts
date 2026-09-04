/** Owned concern: replace one generated DBT model with its canonical Substrait Transform. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanvasColumnFunctionIdentity } from './canvasColumnFunctionAuthoring';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { projectDbtModelColumnStates } from './canvasDbtModelColumnAuthoring';
import {
  applyDvtSubstraitProjectionFunction,
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

function fieldId(name: string): string {
  return `output:${encodeURIComponent(name)}`;
}

function findColumnName(
  columns: readonly Readonly<{ column: Readonly<{ name: string }> }>[],
  identity: string
): string | undefined {
  return columns.find(({ column }) => column.name === identity || fieldId(column.name) === identity)
    ?.column.name;
}

function removeDbtAuthority(node: CanonicalNode): CanonicalNode {
  const {
    dbt: _dbt,
    config: _config,
    sql: _sql,
    compiledSql: _compiledSql,
    package: _package,
    ...presentationMetadata
  } = node.metadata ?? {};
  return { ...node, pluginId: 'dvt', kind: 'dvt:transform', metadata: presentationMetadata };
}

export function replaceGeneratedDbtModelWithTransform(args: {
  draftSession: CanvasDraftSession;
  nodeCatalog: ReadonlyMap<string, CanonicalNode>;
  targetNode: CanonicalNode;
  identity: CanvasColumnFunctionIdentity;
}): CanonicalNode | null {
  const dbtMetadata = createDbtNodeAuthoringMetadata(args.targetNode);
  const connectedSourceIds = args.draftSession.workingSet.visibleEdges
    .filter((edge) => edge.targetId === args.targetNode.id)
    .map((edge) => edge.sourceId);
  const sourceId =
    connectedSourceIds.find((candidate) => candidate === dbtMetadata.selectedSourceId) ??
    (connectedSourceIds.length === 1 ? connectedSourceIds[0] : undefined);
  const sourceNode = sourceId == null ? undefined : args.nodeCatalog.get(sourceId);
  const source = sourceNode == null ? null : resolveDvtSubstraitProjectionSource(sourceNode);
  if (source == null) return null;

  const availableColumns = projectCanvasNodePresentationTruth({
    node: args.targetNode,
    nodes: [...args.nodeCatalog.values()],
    edges: args.draftSession.workingSet.visibleEdges,
  }).columns.visible;
  const selectedColumns = projectDbtModelColumnStates(args.targetNode, availableColumns).filter(
    ({ output }) => output
  );
  const outputName = findColumnName(selectedColumns, args.identity.columnId);
  const sourceName =
    args.identity.sourceColumnId == null
      ? outputName
      : findColumnName(selectedColumns, args.identity.sourceColumnId);
  const sourceField = source.fields.find((field) => field.name === sourceName);
  if (
    outputName == null ||
    sourceName == null ||
    sourceField == null ||
    (args.identity.sourceColumnId != null && outputName === sourceName)
  ) {
    return null;
  }

  const draft = createDvtSubstraitProjectionDraft({
    source,
    targetNodeId: args.targetNode.id,
    outputs: selectedColumns.map(({ column }) => ({
      fieldId: fieldId(column.name),
      name: column.name,
      sourceFieldName: column.name,
    })),
  });
  const nextDraft = applyDvtSubstraitProjectionFunction(draft, {
    fieldId: fieldId(outputName),
    ...(sourceName === outputName ? {} : { inputFieldId: fieldId(sourceName) }),
    capabilityId: args.identity.capabilityId,
    alias: args.identity.alias,
    dataType: sourceField.dataType,
    provider: source.sourceRef.connectionRef.provider,
  });
  return nextDraft === draft
    ? null
    : applyDvtSubstraitSemanticDocument(
        removeDbtAuthority(args.targetNode),
        encodeDvtSubstraitProjectionDocument(nextDraft)
      );
}
