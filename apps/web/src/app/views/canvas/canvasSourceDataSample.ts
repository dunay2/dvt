/** Owned concern: resolve Canvas data-sample targets and presentation-safe failures. */
import { ConnectedSourceRefSchema, type SourceDataSampleRequest } from '@dvt/contracts';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { OperationalDrawerDataSample } from '../../components/shell/operationalDrawerContributionStore';
import type { SourceDataSample } from '../../ports/workspace';
import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';

export const CANVAS_SOURCE_DATA_SAMPLE_LIMIT = 20 as const;

/** Present the selected Source publication without changing the physical query result. */
export function projectCanvasSourceDataSample(
  sample: SourceDataSample,
  selectedFieldNames: readonly string[]
): SourceDataSample {
  const columnIndexes = selectedFieldNames.map((name) =>
    sample.columns.findIndex((column) => column.name === name)
  );
  if (columnIndexes.some((index) => index < 0)) {
    throw new Error('Selected Source output is absent from the sample.');
  }
  return {
    ...sample,
    columns: columnIndexes.map((index) => sample.columns[index]!),
    rows: sample.rows.map((row) => ({
      values: columnIndexes.map((index) => row.values[index] ?? null),
    })),
  };
}

export type CanvasSourceDataSampleTarget = Readonly<{
  connectionId: string;
  objectId: string;
  expectedPublicationToken?: SourceDataSampleRequest['expectedPublicationToken'];
  nodeName: string;
}>;

export function resolveCanvasSourceDataSampleTarget(
  data: DbtNodeData
): CanvasSourceDataSampleTarget | null {
  return resolveCanvasConnectedSourceDataSampleTarget(data.metadata?.connectedSourceRef, data.name);
}

/** Admit the Source card from published truth, never from its cached display columns. */
export function resolveCanvasSourceSamplePublication(data: DbtNodeData) {
  const target = resolveCanvasSourceDataSampleTarget(data);
  if (target == null) return null;
  if (data.pluginKind !== 'dvt:source') return { target, selectedFieldNames: undefined };
  const truth = data.presentationTruth;
  if (truth?.columns.state !== 'ready') return null;
  const selectedFieldNames = truth.columns.visible
    .filter((column) => column.selected !== false)
    .map((column) => column.sourceFieldName ?? column.name);
  if (selectedFieldNames.length === 0) return null;
  return {
    target,
    selectedFieldNames,
    semanticDigest: truth.code.kind === 'canonical' ? truth.code.digest : undefined,
  };
}

export function resolveCanvasConnectedSourceDataSampleTarget(
  sourceRef: unknown,
  nodeName: string
): CanvasSourceDataSampleTarget | null {
  const connectedSourceRef = ConnectedSourceRefSchema.safeParse(sourceRef);
  if (
    !connectedSourceRef.success ||
    !connectedSourceRef.data.sourceObjectId.startsWith('relation/')
  ) {
    return null;
  }

  return {
    connectionId: connectedSourceRef.data.connectionRef.connectionId,
    objectId: connectedSourceRef.data.sourceObjectId,
    nodeName,
  };
}
export function resolveCanvasSourceDataSampleError(
  error: unknown,
  nodeName: string
): OperationalDrawerDataSample {
  return {
    status: 'error',
    nodeName,
    reason: error instanceof WarehouseSourceDataSampleQueryError ? error.reason : 'unknown',
  };
}
