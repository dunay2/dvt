import { mockRun } from '../../data/mockDbtData';
import { useSessionStore } from '../../stores/sessionStore';
import type { Run, RunEvent as DbtRunEvent } from '../../types/dbt';
import type { RunContext, RunEvent } from '../../types/engine';
import type {
  RunEventTimelinePage,
  RunSnapshot,
  RunSummaryItem,
  RunsService,
  StartRunInput,
} from './runsService';

function buildMockRunList(): Run[] {
  const completedRun: Run = {
    ...mockRun,
    runId: 'run_abc123',
    status: 'completed',
  };

  return [mockRun, completedRun];
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
  return {
    runId: run.runId,
    planId: run.planId,
    status: run.status,
    environment: run.environment,
    gitSha: run.gitSha,
    startedAt: run.startTime,
    completedAt: run.endTime,
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

function buildMockRunEvents(runId: string): RunEventTimelinePage {
  const { tenantId, projectId, environmentId } = useSessionStore.getState();
  return {
    events: mockRun.events.map((event, index) => {
      return {
        eventId: event.id,
        eventType: mapMockEventType(event.type),
        runId,
        emittedAt: event.timestamp,
        tenantId,
        projectId,
        environmentId,
        planId: mockRun.planId,
        planVersion: '1.0.0',
        engineAttemptId: 1,
        logicalAttemptId: 1,
        idempotencyKey: `${runId}-${event.id}`,
        payloadVersion: 1,
        stepId: event.stepId ?? 'step_runtime',
        payload: event.nodeId
          ? {
              nodeId: event.nodeId,
              originalEventType: event.type,
            }
          : undefined,
        runSeq: index + 1,
        persistedAt: event.timestamp,
      };
    }),
  };
}

export function createMockRunsService(): RunsService {
  return {
    listRunSummaries: async () =>
      buildMockRunList().map(mapDbtRunToSnapshot).map(mapSnapshotToSummary),
    getRunSnapshot: async (runId) => {
      const run = buildMockRunList().find((candidate) => candidate.runId === runId) ?? null;
      return run ? mapDbtRunToSnapshot(run) : null;
    },
    startRun: async (input) => {
      const base = {
        tenantId: input.context.tenantId,
        workflowId: `wf_${input.context.runId}`,
        runId: input.context.runId,
      };

      if (input.context.targetAdapter === 'temporal') {
        return {
          provider: 'temporal',
          namespace: 'default',
          ...base,
        };
      }

      if (input.context.targetAdapter === 'conductor') {
        return {
          provider: 'conductor',
          conductorUrl: 'http://localhost:8080',
          ...base,
        };
      }

      return {
        provider: 'mock',
        ...base,
      };
    },
    listRunEvents: async (runId) => buildMockRunEvents(runId),
  };
}

export function buildSessionRunContext(runId: string): RunContext {
  return useSessionStore.getState().buildRunContext(runId);
}
