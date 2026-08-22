import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parsePlanAdmissionLink,
  parsePlanExecutabilityRecord,
  parsePlanRecord,
} from '../../src/validation.js';
import { VALID_EXECUTION_PLAN_V1_FIXTURE } from '../fixtures/planner-contract.fixtures.js';

const validCanonicalPlanJson = jcsCanonicalize(VALID_EXECUTION_PLAN_V1_FIXTURE);
const planStoreScope = VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.ownership;

const validPlanRecord = {
  tenantId: planStoreScope.tenantId,
  projectId: planStoreScope.projectId,
  environmentId: planStoreScope.environmentId,
  planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
  canonicalPlanJson: validCanonicalPlanJson,
  canonicalHash: sha256HexUtf8(validCanonicalPlanJson),
  planVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planVersion,
  schemaVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.schemaVersion,
  contractVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.contractVersion,
  sourceRef: 'planner://build/123',
  state: 'ACTIVE',
  createdAtIso: '2026-04-02T10:00:00.000Z',
  updatedAtIso: '2026-04-02T10:00:00.000Z',
} as const;

export function registerValidationPlanRecordsSuite(): void {
  describe('plan records and executability artifacts', () => {
    it('parses PlanRecord with canonical persisted artifact fields', () => {
      const record = parsePlanRecord(validPlanRecord);

      expect(record.state).toBe('ACTIVE');
      expect(record.canonicalHash).toHaveLength(64);
    });

    it('rejects PlanRecord without a plan-store scope tuple', () => {
      const { tenantId, projectId, environmentId, ...unscopedRecord } = validPlanRecord;
      void tenantId;
      void projectId;
      void environmentId;

      expect(() => parsePlanRecord(unscopedRecord)).toThrow(ContractValidationError);
    });

    it('rejects PlanRecord when canonicalPlanJson metadata does not match top-level identity', () => {
      expect(() =>
        parsePlanRecord({
          ...validPlanRecord,
          planId: 'a'.repeat(64),
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects PlanRecord when state ARCHIVED omits archivedAtIso', () => {
      expect(() =>
        parsePlanRecord({
          ...validPlanRecord,
          state: 'ARCHIVED',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects PlanRecord when state ACTIVE includes archivedAtIso', () => {
      expect(() =>
        parsePlanRecord({
          ...validPlanRecord,
          archivedAtIso: '2026-04-02T11:00:00.000Z',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects PlanRecord when schemaVersion is not the governed canonical value', () => {
      expect(() =>
        parsePlanRecord({
          ...validPlanRecord,
          schemaVersion: 'v1',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects PlanRecord when canonicalPlanJson is not valid JSON', () => {
      expect(() =>
        parsePlanRecord({
          ...validPlanRecord,
          canonicalPlanJson: '{not-json}',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects PlanRecord when canonicalPlanJson is not a valid ExecutionPlan', () => {
      expect(() =>
        parsePlanRecord({
          ...validPlanRecord,
          canonicalPlanJson: JSON.stringify({ metadata: { planId: 'a'.repeat(64) } }),
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects PlanRecord when canonicalHash does not match canonicalPlanJson', () => {
      expect(() =>
        parsePlanRecord({
          ...validPlanRecord,
          canonicalHash: 'f'.repeat(64),
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects PlanRecord when canonicalPlanJson is not JCS(canonical ExecutionPlan)', () => {
      const nonCanonicalPlanJson = JSON.stringify({
        steps: VALID_EXECUTION_PLAN_V1_FIXTURE.steps,
        metadata: {
          createdAtIso: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.createdAtIso,
          planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
          inputHashSha256: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.inputHashSha256,
          contractVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.contractVersion,
          schemaVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.schemaVersion,
          planVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planVersion,
        },
      });

      expect(() =>
        parsePlanRecord({
          ...validPlanRecord,
          canonicalPlanJson: nonCanonicalPlanJson,
          canonicalHash: sha256HexUtf8(nonCanonicalPlanJson),
        })
      ).toThrow(ContractValidationError);
    });

    it('parses INVALID PlanExecutabilityRecord with canonical rejection code', () => {
      const record = parsePlanExecutabilityRecord({
        tenantId: planStoreScope.tenantId,
        projectId: planStoreScope.projectId,
        environmentId: planStoreScope.environmentId,
        planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
        adapterId: 'temporal',
        state: 'INVALID',
        validatedAtIso: '2026-04-02T10:03:00.000Z',
        rejectionReport: {
          code: 'MISSING_CAPABILITY',
          reason: 'Temporal worker missing capability',
          degradable: false,
        },
      });

      expect(record.state).toBe('INVALID');
      if (record.state === 'INVALID') {
        expect(record.rejectionReport.code).toBe('MISSING_CAPABILITY');
      }
    });

    it('rejects PlanExecutabilityRecord without a plan-store scope tuple', () => {
      expect(() =>
        parsePlanExecutabilityRecord({
          planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
          adapterId: 'temporal',
          state: 'PENDING',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects PlanExecutabilityRecord with unknown state', () => {
      expect(() =>
        parsePlanExecutabilityRecord({
          tenantId: planStoreScope.tenantId,
          projectId: planStoreScope.projectId,
          environmentId: planStoreScope.environmentId,
          planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
          adapterId: 'temporal',
          state: 'READY',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects VALID PlanExecutabilityRecord when rejectionReport is present', () => {
      expect(() =>
        parsePlanExecutabilityRecord({
          tenantId: planStoreScope.tenantId,
          projectId: planStoreScope.projectId,
          environmentId: planStoreScope.environmentId,
          planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
          adapterId: 'temporal',
          state: 'VALID',
          validatedAtIso: '2026-04-02T10:03:00.000Z',
          rejectionReport: {
            code: 'MISSING_CAPABILITY',
            reason: 'should not exist for VALID',
            degradable: false,
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects INVALID PlanExecutabilityRecord without rejectionReport', () => {
      expect(() =>
        parsePlanExecutabilityRecord({
          tenantId: planStoreScope.tenantId,
          projectId: planStoreScope.projectId,
          environmentId: planStoreScope.environmentId,
          planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
          adapterId: 'temporal',
          state: 'INVALID',
          validatedAtIso: '2026-04-02T10:03:00.000Z',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects PlanExecutabilityRecord with non-canonical rejection code', () => {
      expect(() =>
        parsePlanExecutabilityRecord({
          tenantId: planStoreScope.tenantId,
          projectId: planStoreScope.projectId,
          environmentId: planStoreScope.environmentId,
          planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
          adapterId: 'temporal',
          state: 'INVALID',
          validatedAtIso: '2026-04-02T10:03:00.000Z',
          rejectionReport: {
            code: 'PLAN_HASH_MISMATCH',
            reason: 'not part of executability rejection vocabulary',
            degradable: false,
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('parses PlanAdmissionLink relation without overloading PlanRecord state', () => {
      const link = parsePlanAdmissionLink({
        tenantId: planStoreScope.tenantId,
        projectId: planStoreScope.projectId,
        environmentId: planStoreScope.environmentId,
        planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
        runId: 'run-1',
        adapterId: 'temporal',
        admittedAtIso: '2026-04-02T10:05:00.000Z',
      });

      expect(link.runId).toBe('run-1');
      expect(link.adapterId).toBe('temporal');
    });

    it('rejects PlanAdmissionLink without a plan-store scope tuple', () => {
      expect(() =>
        parsePlanAdmissionLink({
          planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
          runId: 'run-1',
          adapterId: 'temporal',
          admittedAtIso: '2026-04-02T10:05:00.000Z',
        })
      ).toThrow(ContractValidationError);
    });
  });
}
