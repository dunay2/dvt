import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDbtTestAuthoringMetadata,
  createDbtTestAuthoringMetadata,
  validateDbtTestAuthoringMetadata,
} from './canvasDbtTestAuthoringModel';

const testNode: CanonicalNode = {
  id: 'dbt-test-1',
  name: 'Orders key required',
  pluginId: 'dbt',
  kind: 'dbt:test',
  role: 'check',
  status: 'idle',
  tags: [],
  metadata: {
    dbtTest: {
      testType: 'not_null',
      targetModelId: 'dbt-model-1',
      targetColumn: 'order_id',
      severity: 'error',
    },
  },
};

describe('canvas DBT test authoring model', () => {
  it('round-trips explicit generic-test semantics without model/source metadata', () => {
    const metadata = createDbtTestAuthoringMetadata(testNode);

    expect(metadata).toEqual({
      testType: 'not_null',
      targetModelId: 'dbt-model-1',
      targetColumn: 'order_id',
      severity: 'error',
    });
    expect(applyDbtTestAuthoringMetadata(testNode, metadata).metadata).toEqual(testNode.metadata);
  });

  it('accepts supported tests and rejects incomplete or unknown semantics', () => {
    expect(validateDbtTestAuthoringMetadata(createDbtTestAuthoringMetadata(testNode))).toEqual({});
    expect(
      validateDbtTestAuthoringMetadata({
        testType: 'relationships',
        targetModelId: '',
        targetColumn: 'bad column',
        severity: 'fatal',
      })
    ).toEqual({
      testType: 'dbt_test_type_invalid',
      targetModelId: 'dbt_test_target_required',
      targetColumn: 'dbt_test_column_invalid',
      severity: 'dbt_test_severity_invalid',
    });
  });

  it('reads imported DBT test semantics while canonicalizing new writes', () => {
    const importedNode: CanonicalNode = {
      ...testNode,
      metadata: {
        testType: 'unique',
        testTargetModel: 'model.analytics.orders',
        testTargetColumn: 'order_id',
        severity: 'warn',
      },
    };

    const metadata = createDbtTestAuthoringMetadata(importedNode);
    const applied = applyDbtTestAuthoringMetadata(importedNode, metadata);

    expect(metadata).toEqual({
      testType: 'unique',
      targetModelId: 'model.analytics.orders',
      targetColumn: 'order_id',
      severity: 'warn',
    });
    expect(applied.metadata?.dbtTest).toEqual(metadata);
  });
});
