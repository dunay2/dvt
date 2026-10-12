/** Compose the Inspector read model from independently owned property projections. */
import { buildDbtTestRows } from './dbtTestRowsReadModel';
import { buildCanvasNodePresentationTruth } from '../canvas/canvasNodePresentationTruth';
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
import { buildInputsOutputsRows, buildSummaryRows } from './nodePropertyTopologyRows';
import { buildSinkRows, buildGeneralRows, buildCommentRows } from './nodePropertyGeneralRows';
import {
  presentNodePropertySection,
  describeNodePropertyColumns,
  buildNodePropertyCodeSection,
} from './nodePropertySections';

export function buildNodePropertiesReadModel({
  node,
  nodes,
  edges,
  presentationCopy: copy,
  presentationTruth: suppliedTruth,
}: BuildNodePropertiesReadModelArgs): NodePropertiesReadModel {
  const metadata = asRecord(node.metadata);
  const columns = readColumns(metadata.columns);
  const truth = suppliedTruth ?? buildCanvasNodePresentationTruth({ node, nodes, edges });
  const columnRows =
    node.pluginId === 'dvt' && node.kind === 'dvt:transform'
      ? buildDvtTransformColumnRows(truth.columns.visible, columns)
      : truth.columns.visibleProvenance === 'declared'
        ? buildColumnRows(columns)
        : buildInheritedColumnRows(
            truth.columns.visibleProvenance === 'mixed'
              ? truth.columns.visible
              : truth.columns.inherited
          );

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
      presentNodePropertySection(
        { id: 'inputs-outputs', tableRows: buildInputsOutputsRows(node, nodes, edges) },
        copy
      ),
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
