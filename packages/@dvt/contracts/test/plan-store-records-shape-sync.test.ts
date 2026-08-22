import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import Ajv from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import planAdmissionLinkSchemaJson from '../src/contracts/planner/PlanAdmissionLink.v1.schema.json' with { type: 'json' };
import planExecutabilityRecordSchemaJson from '../src/contracts/planner/PlanExecutabilityRecord.v1.schema.json' with { type: 'json' };
import planRecordSchemaJson from '../src/contracts/planner/PlanRecord.v1.schema.json' with { type: 'json' };
import {
  PlanAdmissionLinkSchema,
  PlanExecutabilityRecordSchema,
  PlanRecordShapeSchema,
} from '../src/index.js';

import { VALID_EXECUTION_PLAN_V1_FIXTURE } from './fixtures/planner-contract.fixtures.js';

function zodValid(
  schema: { safeParse: (v: unknown) => { success: boolean } },
  input: unknown
): boolean {
  return schema.safeParse(input).success;
}

describe('shape-sync: S08 plan store records', () => {
  const ajv = new Ajv({ strict: false });
  const validatePlanRecord = ajv.compile(planRecordSchemaJson);
  const validatePlanExecutabilityRecord = ajv.compile(planExecutabilityRecordSchemaJson);
  const validatePlanAdmissionLink = ajv.compile(planAdmissionLinkSchemaJson);
  const validCanonicalPlanJson = jcsCanonicalize(VALID_EXECUTION_PLAN_V1_FIXTURE);
  const validCanonicalHash = sha256HexUtf8(validCanonicalPlanJson);
  const planStoreScope = VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.ownership;

  it('keeps PlanRecord structural zod/json schema behavior in sync', () => {
    const valid = {
      tenantId: planStoreScope.tenantId,
      projectId: planStoreScope.projectId,
      environmentId: planStoreScope.environmentId,
      planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
      canonicalPlanJson: validCanonicalPlanJson,
      canonicalHash: validCanonicalHash,
      planVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planVersion,
      schemaVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.schemaVersion,
      contractVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.contractVersion,
      sourceRef: 'planner://build/123',
      state: 'ACTIVE',
      createdAtIso: '2026-04-02T10:00:00.000Z',
      updatedAtIso: '2026-04-02T10:00:00.000Z',
    };
    const invalid = { ...valid, state: 'READY' };

    expect(zodValid(PlanRecordShapeSchema, valid)).toBe(true);
    expect(validatePlanRecord(valid)).toBe(true);
    expect(zodValid(PlanRecordShapeSchema, invalid)).toBe(false);
    expect(validatePlanRecord(invalid)).toBe(false);
  });

  it('requires archivedAtIso only for ARCHIVED PlanRecord state', () => {
    const valid = {
      tenantId: planStoreScope.tenantId,
      projectId: planStoreScope.projectId,
      environmentId: planStoreScope.environmentId,
      planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
      canonicalPlanJson: validCanonicalPlanJson,
      canonicalHash: validCanonicalHash,
      planVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planVersion,
      schemaVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.schemaVersion,
      contractVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.contractVersion,
      sourceRef: 'planner://build/123',
      state: 'ARCHIVED',
      createdAtIso: '2026-04-02T10:00:00.000Z',
      updatedAtIso: '2026-04-02T10:00:00.000Z',
      archivedAtIso: '2026-04-02T11:00:00.000Z',
    };
    const invalid = {
      tenantId: planStoreScope.tenantId,
      projectId: planStoreScope.projectId,
      environmentId: planStoreScope.environmentId,
      planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
      canonicalPlanJson: validCanonicalPlanJson,
      canonicalHash: validCanonicalHash,
      planVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planVersion,
      schemaVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.schemaVersion,
      contractVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.contractVersion,
      sourceRef: 'planner://build/123',
      state: 'ARCHIVED',
      createdAtIso: '2026-04-02T10:00:00.000Z',
      updatedAtIso: '2026-04-02T10:00:00.000Z',
    };

    expect(zodValid(PlanRecordShapeSchema, valid)).toBe(true);
    expect(validatePlanRecord(valid)).toBe(true);
    expect(zodValid(PlanRecordShapeSchema, invalid)).toBe(false);
    expect(validatePlanRecord(invalid)).toBe(false);
  });

  it('keeps PlanExecutabilityRecord structural zod/json schema behavior in sync', () => {
    const valid = {
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
    };
    const invalid = { ...valid, rejectionReport: { reason: 'missing code', degradable: false } };

    expect(zodValid(PlanExecutabilityRecordSchema, valid)).toBe(true);
    expect(validatePlanExecutabilityRecord(valid)).toBe(true);
    expect(zodValid(PlanExecutabilityRecordSchema, invalid)).toBe(false);
    expect(validatePlanExecutabilityRecord(invalid)).toBe(false);
  });

  it('rejects impossible PlanExecutabilityRecord state combinations in both schema systems', () => {
    const pendingWithTimestamp = {
      tenantId: planStoreScope.tenantId,
      projectId: planStoreScope.projectId,
      environmentId: planStoreScope.environmentId,
      planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
      adapterId: 'temporal',
      state: 'PENDING',
      validatedAtIso: '2026-04-02T10:03:00.000Z',
    };
    const invalidCode = {
      tenantId: planStoreScope.tenantId,
      projectId: planStoreScope.projectId,
      environmentId: planStoreScope.environmentId,
      planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
      adapterId: 'temporal',
      state: 'INVALID',
      validatedAtIso: '2026-04-02T10:03:00.000Z',
      rejectionReport: {
        code: 'PLAN_HASH_MISMATCH',
        reason: 'not canonical for executability',
        degradable: false,
      },
    };

    expect(zodValid(PlanExecutabilityRecordSchema, pendingWithTimestamp)).toBe(false);
    expect(validatePlanExecutabilityRecord(pendingWithTimestamp)).toBe(false);
    expect(zodValid(PlanExecutabilityRecordSchema, invalidCode)).toBe(false);
    expect(validatePlanExecutabilityRecord(invalidCode)).toBe(false);
  });

  it('keeps PlanAdmissionLink structural zod/json schema behavior in sync', () => {
    const valid = {
      tenantId: planStoreScope.tenantId,
      projectId: planStoreScope.projectId,
      environmentId: planStoreScope.environmentId,
      planId: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId,
      runId: 'run-1',
      adapterId: 'temporal',
      admittedAtIso: '2026-04-02T10:05:00.000Z',
    };
    const invalid = { ...valid, admittedAtIso: '' };

    expect(zodValid(PlanAdmissionLinkSchema, valid)).toBe(true);
    expect(validatePlanAdmissionLink(valid)).toBe(true);
    expect(zodValid(PlanAdmissionLinkSchema, invalid)).toBe(false);
    expect(validatePlanAdmissionLink(invalid)).toBe(false);
  });
});
