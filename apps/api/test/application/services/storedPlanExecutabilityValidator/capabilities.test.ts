import { LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND, asNonBlankString } from '@dvt/contracts';
import type { IProviderAdapter } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import { StoredPlanMaterializationError } from '../../../../src/application/services/StoredExecutablePlanResolver.js';
import { StoredPlanExecutabilityValidator } from '../../../../src/application/services/StoredPlanExecutabilityValidator.js';

import { makeAdapter, makeMaterializer, materializedPlan, validationInput } from './harness.js';

/**
 * Capability-oriented cases for `StoredPlanExecutabilityValidator`.
 */
function describeStoredPlanExecutabilityValidatorCapabilitiesCases(): void {
  describe('StoredPlanExecutabilityValidator capability checks', () => {
    it('rejects object-file loading until the runtime executor capability is registered', async () => {
      const sha256 = 'a'.repeat(64);
      const validator = new StoredPlanExecutabilityValidator({
        materializer: makeMaterializer(() =>
          materializedPlan({
            stepKind: LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
            ownership: {
              tenantId: 'tenant-a',
              projectId: 'project-a',
              environmentId: 'prod',
            },
            stepTypeConfig: {
              scope: {
                tenantId: 'tenant-a',
                projectId: 'project-a',
                environmentId: 'prod',
              },
              source: {
                storageUri: `s3://dvt-fixtures/tenants/tenant-a/${sha256}`,
                sha256,
                sizeBytes: 128,
                maxBytes: 1_000_000,
                format: 'csv',
                mediaType: 'text/csv',
                encoding: 'utf-8',
                header: true,
                delimiter: ',',
                credentialRef: 'object-store:het1-fixture',
              },
              target: {
                dialect: 'postgres',
                schema: 'staging',
                relation: 'orders_import',
                loadMode: 'replace',
                credentialRef: 'postgres:het1-staging',
              },
              columns: [
                {
                  sourceField: 'order_id',
                  targetColumn: 'order_id',
                  dataType: 'bigint',
                  nullable: false,
                },
              ],
            },
          })
        ),
        adapters: new Map([['temporal', makeAdapter(['basic-execution', 'executor.dbt'])]]),
      });

      await expect(validator.validatePlan(validationInput())).resolves.toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'MISSING_CAPABILITY',
        degradable: false,
        reason: 'Missing adapter capability: executor.object-file-postgres-load',
        cause: 'executor.object-file-postgres-load',
      });
    });

    it('returns OK when the stored executable plan matches the ref and capabilities', async () => {
      const materializer = makeMaterializer(() => materializedPlan());
      const validator = new StoredPlanExecutabilityValidator({
        materializer,
        adapters: new Map([
          ['temporal', makeAdapter(['basic-execution', 'workflow.fan.parallel', 'executor.dbt'])],
        ]),
      });

      const result = await validator.validatePlan(validationInput());

      expect(result).toEqual({
        status: 'OK',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
      });
      expect(materializer.materialize).toHaveBeenCalledWith(validationInput(), 'validation');
    });

    it('rejects when the adapter lacks a required capability', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        materializer: makeMaterializer(() =>
          materializedPlan({
            executionPolicy: { requiresCapabilities: [asNonBlankString('workflow.pause')] },
          })
        ),
        adapters: new Map([['temporal', makeAdapter(['basic-execution', 'executor.dbt'])]]),
      });

      const result = await validator.validatePlan(validationInput());

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'MISSING_CAPABILITY',
        degradable: false,
        reason: 'Missing adapter capability: workflow.pause',
        cause: 'workflow.pause',
      });
    });

    it('rejects when the plan requires capabilities but the adapter does not declare any', async () => {
      const validator = new StoredPlanExecutabilityValidator({
        materializer: makeMaterializer(() =>
          materializedPlan({
            executionPolicy: { requiresCapabilities: [asNonBlankString('workflow.pause')] },
          })
        ),
        adapters: new Map([
          [
            'temporal',
            {
              provider: 'temporal',
              async startRun() {
                throw new Error('not used');
              },
              async cancelRun() {
                throw new Error('not used');
              },
              async getProviderStatusView() {
                throw new Error('not used');
              },
              async signal() {
                throw new Error('not used');
              },
              signalSemanticsVersions() {
                return ['1.0.0'] as const;
              },
            } as IProviderAdapter,
          ],
        ]),
      });

      const result = await validator.validatePlan(validationInput());

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'REJECTED',
        degradable: false,
        reason: 'Adapter does not declare capabilities required for executability validation',
        cause: 'capabilities',
      });
    });

    it('rejects invalid stepTypeConfig before capability checks', async () => {
      const capabilitiesSpy = vi.fn(() => ['basic-execution']);
      const validator = new StoredPlanExecutabilityValidator({
        materializer: makeMaterializer(() => {
          throw new StoredPlanMaterializationError(
            'plan_parse',
            'INVALID_STEP_TYPE_CONFIG: invalid backoff'
          );
        }),
        adapters: new Map([
          [
            'temporal',
            {
              ...makeAdapter(['basic-execution']),
              capabilities: capabilitiesSpy,
            },
          ],
        ]),
      });

      const result = await validator.validatePlan(validationInput());

      expect(result).toEqual({
        status: 'ERROR',
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        adapterId: 'temporal',
        code: 'REJECTED',
        degradable: false,
        reason: expect.stringContaining('INVALID_STEP_TYPE_CONFIG'),
        cause: 'plan_parse',
      });
      expect(capabilitiesSpy).not.toHaveBeenCalled();
    });
  });
}

describeStoredPlanExecutabilityValidatorCapabilitiesCases();
