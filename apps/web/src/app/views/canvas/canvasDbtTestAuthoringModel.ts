/** Owned concern: derive, validate, and apply explicit DBT generic-test semantics. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorNodeDraftErrorCode } from './canvasInspectorAuthoringErrorCodes';

export type DbtTestType = 'not_null' | 'unique';
export type DbtTestSeverity = 'error' | 'warn';

export type DbtTestAuthoringMetadata = Readonly<{
  testType: DbtTestType | string;
  targetModelId: string;
  targetColumn: string;
  severity: DbtTestSeverity | string;
}>;

export type DbtTestAuthoringMetadataErrors = Partial<
  Record<keyof DbtTestAuthoringMetadata, CanvasInspectorNodeDraftErrorCode>
>;

const DBT_TEST_TYPES = new Set<DbtTestType>(['not_null', 'unique']);
const DBT_TEST_SEVERITIES = new Set<DbtTestSeverity>(['error', 'warn']);
const DBT_COLUMN_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$]*$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function createDbtTestAuthoringMetadata(node: CanonicalNode): DbtTestAuthoringMetadata {
  const nested = isRecord(node.metadata?.dbtTest) ? node.metadata.dbtTest : {};
  return {
    testType: readString(nested.testType) ?? readString(node.metadata?.testType) ?? 'not_null',
    targetModelId:
      readString(nested.targetModelId) ??
      readString(node.metadata?.testTargetModel) ??
      readString(node.metadata?.targetModel) ??
      '',
    targetColumn:
      readString(nested.targetColumn) ??
      readString(node.metadata?.testTargetColumn) ??
      readString(node.metadata?.targetColumn) ??
      '',
    severity: readString(nested.severity) ?? readString(node.metadata?.severity) ?? 'error',
  };
}

export function validateDbtTestAuthoringMetadata(
  metadata: DbtTestAuthoringMetadata
): DbtTestAuthoringMetadataErrors {
  const errors: DbtTestAuthoringMetadataErrors = {};
  if (!DBT_TEST_TYPES.has(metadata.testType as DbtTestType)) {
    errors.testType = 'dbt_test_type_invalid';
  }
  if (metadata.targetModelId.trim().length === 0) {
    errors.targetModelId = 'dbt_test_target_required';
  }
  if (!DBT_COLUMN_IDENTIFIER.test(metadata.targetColumn.trim())) {
    errors.targetColumn = 'dbt_test_column_invalid';
  }
  if (!DBT_TEST_SEVERITIES.has(metadata.severity as DbtTestSeverity)) {
    errors.severity = 'dbt_test_severity_invalid';
  }
  return errors;
}

export function applyDbtTestAuthoringMetadata(
  node: CanonicalNode,
  metadata: DbtTestAuthoringMetadata
): CanonicalNode {
  if (node.pluginId !== 'dbt' || node.kind !== 'dbt:test') return node;
  const {
    testType: _legacyTestType,
    testTargetModel: _legacyTargetModel,
    testTargetColumn: _legacyTargetColumn,
    targetModel: _legacyModel,
    targetColumn: _legacyColumn,
    severity: _legacySeverity,
    ...metadataWithoutLegacyTestFields
  } = node.metadata ?? {};

  return {
    ...node,
    metadata: {
      ...metadataWithoutLegacyTestFields,
      dbtTest: {
        testType: metadata.testType,
        targetModelId: metadata.targetModelId.trim(),
        targetColumn: metadata.targetColumn.trim(),
        severity: metadata.severity,
      },
    },
  };
}
