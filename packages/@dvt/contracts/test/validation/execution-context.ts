import { describe, expect, it } from 'vitest';

import {
  ContractValidationError,
  parseEngineRunRef,
  parseResolvedRunContext,
  parseRunContext,
  parseRunExecutionContext,
  parseRunExecutionContextRef,
} from '../../src/validation.js';
import { VALID_EXECUTION_PLAN_V2_FIXTURE } from '../fixtures/planner-contract.fixtures.js';

export function registerValidationExecutionContextSuite(): void {
  describe('execution context contracts', () => {
    it('parses RunContext with valid provider', () => {
      const ctx = parseRunContext({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'prod',
        runId: 'run-1',
        targetAdapter: 'temporal',
      });

      expect(ctx.targetAdapter).toBe('temporal');
    });

    it('parses RunContext with optional runExecutionContextRef', () => {
      const ctx = parseRunContext({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'prod',
        runId: 'run-1',
        targetAdapter: 'temporal',
        runExecutionContextRef: {
          uri: 'dvt-runctx://tenant-a/run-1/context.json',
          sha256: 'abc123',
          schemaVersion: 'v1.0',
          planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
          planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
        },
      });

      expect(ctx.runExecutionContextRef?.uri).toContain('dvt-runctx://');
    });

    it('rejects caller-owned logicalAttemptId on public RunContext', () => {
      expect(() =>
        parseRunContext({
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
          runId: 'run-1',
          targetAdapter: 'temporal',
          logicalAttemptId: 2,
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects EngineRunRef when provider identifiers are only whitespace', () => {
      expect(() =>
        parseEngineRunRef({
          provider: 'temporal',
          tenantId: 'tenant-a',
          namespace: 'temporal-main',
          workflowId: '   ',
          runId: 'run-1',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects EngineRunRef when temporal taskQueue is empty', () => {
      expect(() =>
        parseEngineRunRef({
          provider: 'temporal',
          tenantId: 'tenant-a',
          namespace: 'temporal-main',
          workflowId: 'workflow-1',
          runId: 'run-1',
          taskQueue: '',
        })
      ).toThrow(ContractValidationError);
    });

    it('parses RunExecutionContextRef with valid input', () => {
      const ref = parseRunExecutionContextRef({
        uri: 'dvt-runctx://tenant-a/run-1/context.json',
        sha256: 'abc123',
        schemaVersion: 'v1.0',
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
        pluginCompatibilityFingerprint:
          '1111111111111111111111111111111111111111111111111111111111111111',
      });

      expect(ref.planId).toBe(VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId);
      expect(ref.pluginCompatibilityFingerprint).toHaveLength(64);
    });

    it('rejects malformed RunExecutionContextRef', () => {
      expect(() =>
        parseRunExecutionContextRef({
          uri: '',
          sha256: 'abc123',
          schemaVersion: 'v1.0',
          planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
          planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects RunExecutionContextRef when pluginCompatibilityFingerprint is not canonical sha256', () => {
      expect(() =>
        parseRunExecutionContextRef({
          uri: 'dvt-runctx://tenant-a/run-1/context.json',
          sha256: 'abc123',
          schemaVersion: 'v1.0',
          planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
          planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
          pluginCompatibilityFingerprint: 'invalid-fingerprint',
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects RunExecutionContext when createdAtIso is not strict ISO UTC', () => {
      expect(() =>
        parseRunExecutionContext({
          schemaVersion: 'v1.0',
          planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
          planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
          planSha256: 'a'.repeat(64),
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
          targetAdapter: 'temporal',
          createdAtIso: '2026-13-01T00:00:00.000Z',
          createdBy: 'system',
          pluginContexts: {
            temporal: {
              namespace: 'default',
            },
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('parses RunExecutionContext with governed provenance fields', () => {
      const runExecutionContext = parseRunExecutionContext({
        schemaVersion: 'v1.0',
        planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
        planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
        planSha256: 'a'.repeat(64),
        pluginCompatibilityFingerprint:
          '1111111111111111111111111111111111111111111111111111111111111111',
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'prod',
        targetAdapter: 'temporal',
        createdAtIso: '2026-04-03T10:00:00.000Z',
        createdBy: 'planner-runtime',
        pluginContexts: {
          dbt: {
            projectBundleRef: 'artifacts://runs/run-1/dbt-project.tgz',
          },
        },
      });

      expect(runExecutionContext.pluginContexts.dbt.projectBundleRef).toContain('artifacts://');
      expect(runExecutionContext.pluginCompatibilityFingerprint).toHaveLength(64);
    });

    it('rejects RunExecutionContext when top-level provenance fields are missing', () => {
      expect(() =>
        parseRunExecutionContext({
          schemaVersion: 'v1.0',
          planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
          planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
          targetAdapter: 'temporal',
          createdAtIso: '2026-04-03T10:00:00.000Z',
          createdBy: 'planner-runtime',
          pluginContexts: { dbt: { projectBundleRef: 'artifacts://x' } },
        })
      ).toThrow(ContractValidationError);
    });

    it('rejects RunExecutionContext when plugin contexts include non-ref payload objects', () => {
      expect(() =>
        parseRunExecutionContext({
          schemaVersion: 'v1.0',
          planId: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planId,
          planVersion: VALID_EXECUTION_PLAN_V2_FIXTURE.metadata.planVersion,
          planSha256: 'a'.repeat(64),
          tenantId: 'tenant-a',
          projectId: 'project-a',
          environmentId: 'prod',
          targetAdapter: 'temporal',
          createdAtIso: '2026-04-03T10:00:00.000Z',
          createdBy: 'planner-runtime',
          pluginContexts: {
            dbt: {
              varsRef: { secret: 'inline' },
            },
          },
        })
      ).toThrow(ContractValidationError);
    });

    it('parses ResolvedRunContext with engine-owned retry lineage', () => {
      const ctx = parseResolvedRunContext({
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'prod',
        runId: 'run-2',
        targetAdapter: 'temporal',
        logicalAttemptId: 2,
        parentRunId: 'run-1',
        originRunId: 'run-0',
      });

      expect(ctx.logicalAttemptId).toBe(2);
      expect(ctx.parentRunId).toBe('run-1');
      expect(ctx.originRunId).toBe('run-0');
    });
  });
}
