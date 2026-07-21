import {
  asIsoUtcString,
  asNonBlankString,
  asStepId,
  type CanonicalRunStatus,
  type RunMetadata,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectRunOperationalTruth } from '../../../src/application/services/runOperationalTruth.js';

const metadata: RunMetadata = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'environment-a',
  runId: 'run-platform',
  planId: 'plan-a',
  planVersion: '2.4.0',
  logicalAttemptId: 3,
  providerRef: {
    provider: 'temporal',
    tenantId: asNonBlankString('tenant-a'),
    namespace: asNonBlankString('default'),
    workflowId: asNonBlankString('workflow-a'),
    runId: asNonBlankString('run-provider'),
  },
  createdAt: asIsoUtcString('2026-07-19T10:00:00.000Z'),
};

describe('projectRunOperationalTruth', () => {
  it('combines persisted identity with canonical timing and actionable failure evidence', () => {
    const status: CanonicalRunStatus = {
      runId: 'run-provider',
      status: 'FAILED',
      startedAt: asIsoUtcString('2026-07-19T10:00:05.000Z'),
      completedAt: asIsoUtcString('2026-07-19T10:00:35.000Z'),
      execution: {
        failure: {
          stepId: asStepId('step-load'),
          reason: asNonBlankString('SINK_WRITE_FAILED'),
          message: asNonBlankString('Destination rejected the write'),
          failedAt: asIsoUtcString('2026-07-19T10:00:34.000Z'),
        },
      },
    };

    expect(projectRunOperationalTruth({ metadata, status })).toEqual({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'environment-a',
      runId: 'run-platform',
      planId: 'plan-a',
      planVersion: '2.4.0',
      logicalAttemptId: 3,
      provider: 'temporal',
      createdAt: '2026-07-19T10:00:00.000Z',
      status: 'FAILED',
      startedAt: '2026-07-19T10:00:05.000Z',
      completedAt: '2026-07-19T10:00:35.000Z',
      durationMs: 30_000,
      execution: status.execution,
      failedStepId: 'step-load',
      errorReason: 'SINK_WRITE_FAILED',
    });
  });

  it('does not relabel creation time or fabricate duration when lifecycle times are absent', () => {
    expect(
      projectRunOperationalTruth({
        metadata,
        status: {
          runId: 'run-provider',
          status: 'PENDING',
        },
      })
    ).toEqual({
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'environment-a',
      runId: 'run-platform',
      planId: 'plan-a',
      planVersion: '2.4.0',
      logicalAttemptId: 3,
      provider: 'temporal',
      createdAt: '2026-07-19T10:00:00.000Z',
      status: 'PENDING',
    });
  });

  it('uses enriched failure evidence only when canonical evidence is incomplete', () => {
    expect(
      projectRunOperationalTruth({
        metadata,
        status: {
          runId: 'run-provider',
          status: 'FAILED',
          execution: {
            failure: {
              stepId: asStepId('step-load'),
              failedAt: asIsoUtcString('2026-07-19T10:00:34.000Z'),
            },
          },
        },
        evidence: {
          failedStepId: 'step-load',
          errorReason: 'Warehouse connection closed',
        },
      })
    ).toMatchObject({
      failedStepId: 'step-load',
      errorReason: 'Warehouse connection closed',
    });
  });

  it('removes materialization evidence unless the canonical run is completed', () => {
    const truth = projectRunOperationalTruth({
      metadata,
      status: {
        runId: 'run-provider',
        status: 'FAILED',
        execution: {
          activeStepId: asStepId('step-load'),
          materialization: {
            executor: 'postgres',
            environmentId: asNonBlankString('environment-a'),
            sinkTable: asNonBlankString('analytics.orders'),
            rowsWritten: 42,
            startedAt: asIsoUtcString('2026-07-19T10:00:29.000Z'),
            completedAt: asIsoUtcString('2026-07-19T10:00:34.000Z'),
            durationMs: 5_000,
          },
        },
      },
    });

    expect(truth.execution).toEqual({
      activeStepId: 'step-load',
    });
  });
});
