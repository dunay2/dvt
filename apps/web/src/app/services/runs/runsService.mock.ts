/**
 * Owned concern: provide deterministic local runs-port behavior for frontend
 * development while preserving the API/Web start-run identity boundary.
 */
import { asIsoUtcString, asNonBlankString, asStepId } from '@dvt/contracts';

import { mockRun } from '../../data/mockDbtData';
import type {
  IRunsPort,
  RunEventTimelinePage,
  RunSnapshot,
  RunSummaryItem,
  StartRunInput,
} from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { Run, RunEvent as DbtRunEvent } from '../../types/dbt';
import type { RunEvent } from '../../types/engine';
import { createSessionContextPort } from '../session/sessionContextPort';

function buildMockRunList(): Run[] {
  const completedRun: Run = {
    ...mockRun,
    runId: 'run_abc123',
    status: 'completed',
    endTime: '2026-02-13T10:36:04Z',
  };

  return [mockRun, completedRun];
}

let mockRunSequence = 0;

function createMockRunId(): ReturnType<typeof asNonBlankString> {
  mockRunSequence += 1;
  return asNonBlankString(`run_mock_${mockRunSequence}`);
}

function mapMockEventType(eventType: DbtRunEvent['type']): RunEvent['eventType'] {
  switch (eventType) {
    case 'NodeStarted':
      return 'StepStarted';
    case 'NodeCompleted':
      return 'StepCompleted';
    case 'NodeFailed':
      return 'StepFailed';
    default:
      return eventType;
  }
}

function mapDbtRunToSnapshot(run: Run): RunSnapshot {
  const materialization =
    run.status === 'completed' && run.endTime
      ? {
          executor: 'postgres' as const,
          environmentId: run.environment,
          sinkTable: 'analytics.fct_sales',
          rowsWritten: 1284,
          startedAt: run.startTime,
          completedAt: run.endTime,
          durationMs: Math.max(0, Date.parse(run.endTime) - Date.parse(run.startTime)),
        }
      : undefined;

  return {
    runId: run.runId,
    planId: run.planId,
    status: run.status,
    environment: run.environment,
    gitSha: run.gitSha,
    startedAt: run.startTime,
    completedAt: run.endTime,
    execution:
      run.status === 'running' || materialization
        ? {
            ...(run.status === 'running' ? { activeStepId: 'step_run' } : {}),
            ...(materialization ? { materialization } : {}),
          }
        : undefined,
  };
}

function mapSnapshotToSummary(snapshot: RunSnapshot): RunSummaryItem {
  return {
    runId: snapshot.runId,
    planId: snapshot.planId,
    status: snapshot.status,
    environment: snapshot.environment,
    gitSha: snapshot.gitSha,
    startedAt: snapshot.startedAt,
    completedAt: snapshot.completedAt,
  };
}

function buildMockRunEvents(
  sessionContext: SessionContextPort,
  runId: string
): RunEventTimelinePage {
  const { tenantId, projectId, environmentId } = sessionContext.getWorkspaceScope();
  return {
    events: mockRun.events.map((event, index) => {
      return {
        eventId: event.id,
        eventType: mapMockEventType(event.type),
        runId,
        emittedAt: asIsoUtcString(event.timestamp),
        tenantId: asNonBlankString(tenantId),
        projectId: asNonBlankString(projectId),
        environmentId: asNonBlankString(environmentId),
        planId: mockRun.planId,
        planVersion: '1.0.0',
        engineAttemptId: 1,
        logicalAttemptId: 1,
        idempotencyKey: `${runId}-${event.id}`,
        payloadVersion: 1,
        stepId: asStepId(event.stepId ?? 'step_runtime'),
        payload: event.nodeId
          ? {
              nodeId: event.nodeId,
              originalEventType: event.type,
            }
          : undefined,
        runSeq: index + 1,
        persistedAt: asIsoUtcString(event.timestamp),
      };
    }),
  };
}

export function createMockRunsService(
  sessionContext: SessionContextPort = createSessionContextPort()
): IRunsPort {
  return {
    listRunSummaries: async () =>
      buildMockRunList().map(mapDbtRunToSnapshot).map(mapSnapshotToSummary),
    getRunSnapshot: async (runId) => {
      const run = buildMockRunList().find((candidate) => candidate.runId === runId) ?? null;
      return run ? mapDbtRunToSnapshot(run) : null;
    },
    startRun: async (input) => {
      const runId = createMockRunId();
      const base = {
        tenantId: asNonBlankString(input.workspaceScope.tenantId),
        workflowId: asNonBlankString(`wf_${runId}`),
        runId,
      };

      if (input.workspaceScope.targetAdapter === 'temporal') {
        return {
          provider: 'temporal',
          namespace: asNonBlankString('default'),
          ...base,
        };
      }

      if (input.workspaceScope.targetAdapter === 'conductor') {
        return {
          provider: 'conductor',
          conductorUrl: asNonBlankString('http://localhost:8080'),
          ...base,
        };
      }

      return {
        provider: 'mock',
        ...base,
      };
    },
    listRunEvents: async (runId) => buildMockRunEvents(sessionContext, runId),
  };
}
