/** Owned concern: project a governed canvas DBT test into executable artifact semantics. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createDbtTestAuthoringMetadata,
  type DbtTestSeverity,
  type DbtTestType,
  validateDbtTestAuthoringMetadata,
} from './canvasDbtTestAuthoringModel';
import { normalizeDbtArtifactIdentifier } from './canvasDbtModelArtifactProjection';
import { resolveConnectedDbtTestTargets } from './canvasDbtTestTargetPolicy';

export type DbtTestArtifactProjection = Readonly<{
  testNodeId: string;
  targetModelId: string;
  modelName: string;
  columnName: string;
  testType: DbtTestType;
  severity: DbtTestSeverity;
  selector: string;
}>;

export type DbtTestArtifactProjectionResult =
  | Readonly<{ ok: true; artifact: DbtTestArtifactProjection }>
  | Readonly<{ ok: false; message: string }>;

export function projectDbtTestArtifact(args: {
  testNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}): DbtTestArtifactProjectionResult {
  if (args.testNode.pluginId !== 'dbt' || args.testNode.kind !== 'dbt:test') {
    return { ok: false, message: `Node "${args.testNode.name}" is not a DBT test.` };
  }

  const metadata = createDbtTestAuthoringMetadata(args.testNode);
  const connectedModels = resolveConnectedDbtTestTargets({
    testNodeId: args.testNode.id,
    nodes: args.nodes,
    edges: args.edges,
  });
  const configuredTargetId = metadata.targetModelId.trim();
  if (configuredTargetId && !connectedModels.some((model) => model.id === configuredTargetId)) {
    return {
      ok: false,
      message: `DBT test "${args.testNode.name}" targets a model that is not connected.`,
    };
  }

  const targetModel = configuredTargetId
    ? connectedModels.find((model) => model.id === configuredTargetId)
    : connectedModels.length === 1
      ? connectedModels[0]
      : undefined;
  if (!targetModel) {
    return {
      ok: false,
      message: `DBT test "${args.testNode.name}" requires exactly one connected target model.`,
    };
  }

  const errors = validateDbtTestAuthoringMetadata({
    ...metadata,
    targetModelId: targetModel.id,
  });
  if (errors.targetColumn) {
    return {
      ok: false,
      message: `DBT test "${args.testNode.name}" requires a valid target column.`,
    };
  }
  if (errors.testType) {
    return {
      ok: false,
      message: `DBT test "${args.testNode.name}" uses an unsupported validation rule.`,
    };
  }
  if (errors.severity) {
    return {
      ok: false,
      message: `DBT test "${args.testNode.name}" uses an unsupported severity.`,
    };
  }

  return {
    ok: true,
    artifact: {
      testNodeId: args.testNode.id,
      targetModelId: targetModel.id,
      modelName: normalizeDbtArtifactIdentifier(targetModel.name, targetModel.id),
      columnName: metadata.targetColumn.trim(),
      testType: metadata.testType as DbtTestType,
      severity: metadata.severity as DbtTestSeverity,
      selector: normalizeDbtArtifactIdentifier(args.testNode.id, 'dbt_test'),
    },
  };
}
