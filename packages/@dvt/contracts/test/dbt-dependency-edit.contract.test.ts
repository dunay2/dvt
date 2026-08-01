import { describe, expect, it } from 'vitest';

import {
  DbtDependencyEditRequestSchema,
  DbtDependencyEditResultSchema,
} from '../src/contracts/dbt-project/DbtDependencyEdit.v1.js';

const sha = (digit: string) => digit.repeat(64);

const request = {
  schemaVersion: 'dbt-dependency-edit-request.v1',
  canvasId: 'canvas-1',
  selectedUniqueId: 'model.analytics.orders',
  expectedProjectContentSetSha256: sha('1'),
  expectedAnalysisSha256: sha('2'),
  expectedSelectedAnalysisSha256: sha('3'),
  regionId: `dbt-region:${sha('4')}`,
  expectedTargetUniqueId: 'model.analytics.customers',
  nextTargetUniqueId: 'model.analytics.accounts',
  idempotencyKey: 'edit-orders-dependency-1',
} as const;

describe('DbtDependencyEdit contract', () => {
  it('accepts a semantic dependency retarget without replacement source text', () => {
    const parsed = DbtDependencyEditRequestSchema.parse(request);

    expect(parsed).toEqual(request);
    expect(parsed).not.toHaveProperty('content');
    expect(parsed).not.toHaveProperty('replacement');
  });

  it('accepts an applied receipt bound to previous and candidate analysis identities', () => {
    const result = DbtDependencyEditResultSchema.parse({
      schemaVersion: 'dbt-dependency-edit-result.v1',
      kind: 'applied',
      receipt: {
        schemaVersion: 'dbt-dependency-edit-applied-receipt.v1',
        receiptId: sha('a'),
        canvasId: request.canvasId,
        selectedUniqueId: request.selectedUniqueId,
        regionId: request.regionId,
        path: 'models/orders.sql',
        previousTargetUniqueId: request.expectedTargetUniqueId,
        nextTargetUniqueId: request.nextTargetUniqueId,
        expectedContentSha256: sha('5'),
        appliedContentSha256: sha('6'),
        previousProjectContentSetSha256: request.expectedProjectContentSetSha256,
        projectContentSetSha256: sha('7'),
        previousAnalysisSha256: request.expectedAnalysisSha256,
        analysisSha256: sha('8'),
        previousSelectedAnalysisSha256: request.expectedSelectedAnalysisSha256,
        selectedAnalysisSha256: sha('9'),
        idempotencyKey: request.idempotencyKey,
        requestHash: sha('b'),
        deduplicated: false,
      },
    });

    expect(result.kind).toBe('applied');
  });

  it('accepts typed no-op, refusal, and atomic conflict outcomes', () => {
    expect(
      DbtDependencyEditResultSchema.parse({
        schemaVersion: 'dbt-dependency-edit-result.v1',
        kind: 'no_change',
        canvasId: request.canvasId,
        selectedUniqueId: request.selectedUniqueId,
        regionId: request.regionId,
        targetUniqueId: request.expectedTargetUniqueId,
        projectContentSetSha256: request.expectedProjectContentSetSha256,
        analysisSha256: request.expectedAnalysisSha256,
        selectedAnalysisSha256: request.expectedSelectedAnalysisSha256,
      }).kind
    ).toBe('no_change');

    expect(
      DbtDependencyEditResultSchema.parse({
        schemaVersion: 'dbt-dependency-edit-result.v1',
        kind: 'refused',
        finding: {
          code: 'dbt_dependency_edit_region_code_only',
          subject: { kind: 'region', regionId: request.regionId, path: 'models/orders.sql' },
          evidence: { reasonCode: 'dbt_jinja_dynamic_argument' },
        },
      }).kind
    ).toBe('refused');

    expect(
      DbtDependencyEditResultSchema.parse({
        schemaVersion: 'dbt-dependency-edit-result.v1',
        kind: 'conflict',
        conflicts: [{ path: 'models/orders.sql', currentContentSha256: sha('c') }],
      }).kind
    ).toBe('conflict');
  });

  it('rejects applied receipts that claim a no-op or unchanged file revision', () => {
    const baseReceipt = {
      schemaVersion: 'dbt-dependency-edit-applied-receipt.v1',
      receiptId: sha('a'),
      canvasId: request.canvasId,
      selectedUniqueId: request.selectedUniqueId,
      regionId: request.regionId,
      path: 'models/orders.sql',
      previousTargetUniqueId: request.expectedTargetUniqueId,
      nextTargetUniqueId: request.nextTargetUniqueId,
      expectedContentSha256: sha('5'),
      appliedContentSha256: sha('6'),
      previousProjectContentSetSha256: request.expectedProjectContentSetSha256,
      projectContentSetSha256: sha('7'),
      previousAnalysisSha256: request.expectedAnalysisSha256,
      analysisSha256: sha('8'),
      previousSelectedAnalysisSha256: request.expectedSelectedAnalysisSha256,
      selectedAnalysisSha256: sha('9'),
      idempotencyKey: request.idempotencyKey,
      requestHash: sha('b'),
      deduplicated: false,
    } as const;

    expect(() =>
      DbtDependencyEditResultSchema.parse({
        schemaVersion: 'dbt-dependency-edit-result.v1',
        kind: 'applied',
        receipt: { ...baseReceipt, nextTargetUniqueId: baseReceipt.previousTargetUniqueId },
      })
    ).toThrow();
    expect(() =>
      DbtDependencyEditResultSchema.parse({
        schemaVersion: 'dbt-dependency-edit-result.v1',
        kind: 'applied',
        receipt: { ...baseReceipt, appliedContentSha256: baseReceipt.expectedContentSha256 },
      })
    ).toThrow();
  });
});
