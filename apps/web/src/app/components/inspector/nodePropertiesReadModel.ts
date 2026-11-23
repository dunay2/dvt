/** Compose the Inspector read model from independently owned property projections. */
import { buildDbtTestRows } from './dbtTestRowsReadModel';
import {
  buildCanvasNodePresentationTruth,
  selectCanvasNodeOutputColumns,
} from '../canvas/canvasNodePresentationTruth';
import type {
  BuildNodePropertiesReadModelArgs,
  NodePropertiesReadModel,
} from './nodePropertiesContracts';
import { asRecord } from './nodePropertyValues';
import {
  readColumns,
  buildDvtTransformColumnRows,
  buildColumnRows,
  buildInheritedColumnRows,
} from './nodePropertyColumnRows';
import {
  buildKeyRows,
  buildIndexRows,
  buildForeignKeyRows,
  buildConstraintRows,
} from './nodePropertyConstraintRows';
import {
  buildInputsOutputsRows,
  buildSummaryRows,
  isInspectorSource,
} from './nodePropertyTopologyRows';
import { buildSinkRows, buildGeneralRows, buildCommentRows } from './nodePropertyGeneralRows';
import {
  presentNodePropertySection,
  describeNodePropertyColumns,
  buildNodePropertyCodeSection,
} from './nodePropertySections';

export function buildNodePropertiesReadModel(
  args: BuildNodePropertiesReadModelArgs
): NodePropertiesReadModel {
  const { node, nodes, edges, presentationCopy: copy, presentationTruth: suppliedTruth } = args;
  const metadata = asRecord(node.metadata);
  const columns = readColumns(metadata.columns);
  const truth = suppliedTruth ?? buildCanvasNodePresentationTruth({ node, nodes, edges });
  const columnRows = buildVisibleColumnRows({ node, truth, columns });

  return {
    nodeId: node.id,
    nodeName: node.name,
    sections: [
      presentNodePropertySection(
        { id: 'general', rows: buildGeneralRows(node, metadata, copy) },
        copy
      ),
      presentNodePropertySection(
        {
          id: 'columns',
          label: copy?.columnsLabel,
          tableRows: columnRows,
          description: describeNodePropertyColumns(truth, copy),
        },
        copy
      ),
      buildNodeTopologySection(args),
      presentNodePropertySection(
        { id: 'tests', tableRows: buildDbtTestRows({ node, metadata, nodes, edges }) },
        copy
      ),
      presentNodePropertySection({ id: 'keys', tableRows: buildKeyRows(metadata, columns) }, copy),
      presentNodePropertySection({ id: 'indexes', tableRows: buildIndexRows(metadata) }, copy),
      presentNodePropertySection(
        { id: 'foreign-keys', tableRows: buildForeignKeyRows(metadata) },
        copy
      ),
      presentNodePropertySection(
        { id: 'constraints', tableRows: buildConstraintRows(metadata) },
        copy
      ),
      presentNodePropertySection({ id: 'comments', rows: buildCommentRows(node, metadata) }, copy),
      ...(node.kind === 'dvt:sink'
        ? [presentNodePropertySection({ id: 'sink', rows: buildSinkRows(node, metadata) }, copy)]
        : []),
      buildNodePropertyCodeSection(truth, copy),
      presentNodePropertySection(
        { id: 'summary', rows: buildSummaryRows(node, nodes, edges) },
        copy
      ),
    ],
  };
}

function buildVisibleColumnRows({
  node,
  truth,
  columns,
}: {
  node: BuildNodePropertiesReadModelArgs['node'];
  truth: ReturnType<typeof buildCanvasNodePresentationTruth>;
  columns: ReturnType<typeof readColumns>;
}) {
  if (truth.inputBindings != null)
    return buildDvtTransformColumnRows(selectCanvasNodeOutputColumns(truth), columns);
  if (node.pluginId === 'dvt' && node.kind === 'dvt:transform')
    return buildDvtTransformColumnRows(truth.columns.visible, columns);
  if (truth.columns.visibleProvenance === 'declared') return buildColumnRows(columns);
  return buildInheritedColumnRows(
    truth.columns.visibleProvenance === 'mixed' ? truth.columns.visible : truth.columns.inherited
  );
}

function buildNodeTopologySection({
  node,
  nodes,
  edges,
  presentationCopy: copy,
}: BuildNodePropertiesReadModelArgs) {
  const topology = presentNodePropertySection(
    { id: 'inputs-outputs', tableRows: buildInputsOutputsRows(node, nodes, edges) },
    copy
  );
  if (!isInspectorSource(node)) return topology;
  return {
    ...topology,
    label: copy?.sourceOutputs?.label ?? 'Outputs',
    emptyState:
      topology.tableRows.length === 0
        ? (copy?.sourceOutputs?.emptyState ??
          'This source has no outgoing connections in the Canvas.')
        : undefined,
  };
}
