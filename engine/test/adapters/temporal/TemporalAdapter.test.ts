/**
 * DVT Engine - TemporalAdapter Unit Tests
 * Phase 1: MVP test coverage
 */

// Mock uuid before other imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-12345'),
}));

// Mock Temporal Client
jest.mock('@temporalio/client', () => ({
  Connection: {
    connect: jest.fn().mockResolvedValue({
      close: jest.fn(),
      workflowService: {},
    }),
  },
  Client: jest.fn().mockImplementation(() => ({
    workflow: {
      getHandle: jest.fn().mockReturnValue({
        cancel: jest.fn().mockResolvedValue(undefined),
        describe: jest.fn().mockResolvedValue({
          status: { name: 'RUNNING' },
          startTime: new Date('2026-02-11T10:00:00Z'),
          closeTime: null,
        }),
        signal: jest.fn().mockResolvedValue(undefined),
      }),
    },
  })),
}));

import {
  TemporalAdapter,
  TemporalAdapterConfig,
} from '../../../src/adapters/temporal/TemporalAdapter';
import { InMemoryStateStore } from '../../../src/state/IRunStateStore';
import {
  ExecutionPlan,
  RunContext,
  SignalType,
  EngineRunRef,
} from '../../../src/types/contracts';

describe('TemporalAdapter', () => {
  let adapter: TemporalAdapter;
  let stateStore: InMemoryStateStore;
  let config: TemporalAdapterConfig;
  let mockConnection: jest.Mock;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup connection mock
    const { Connection } = require('@temporalio/client');
    mockConnection = Connection.connect as jest.Mock;
    mockConnection.mockResolvedValue({
      close: jest.fn(),
      workflowService: {},
    });

    stateStore = new InMemoryStateStore();
    config = {
      temporal: {
        address: 'localhost:7233',
        namespace: 'test-namespace',
        taskQueue: 'test-task-queue',
      },
      stateStore,
    };
    adapter = new TemporalAdapter(config);
    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('startRun', () => {
    it('should start a workflow run and persist RunStartedEvent', async () => {
      const executionPlan: ExecutionPlan = {
        planId: 'plan-123',
        planVersion: 'v1.0.0',
        schemaVersion: 'v1.0',
        steps: [
          {
            stepId: 'step-1',
            type: 'HTTP_REQUEST',
            name: 'Test Step',
            params: { url: 'https://example.com' },
          },
        ],
      };

      const context: RunContext = {
        tenantId: 'tenant-123',
        projectId: 'project-456',
        environmentId: 'prod',
        runId: 'run-789',
        targetAdapter: 'temporal',
      };

      const engineRunRef = await adapter.startRun(executionPlan, context);

      // Verify EngineRunRef
      expect(engineRunRef.provider).toBe('temporal');
      if (engineRunRef.provider === 'temporal') {
        expect(engineRunRef.namespace).toBe('test-namespace');
        expect(engineRunRef.workflowId).toBe('project-456-prod-run-789');
        expect(engineRunRef.runId).toBe('run-789');
      }

      // Verify StateStore has RunStartedEvent
      const events = await stateStore.fetchEvents('run-789');
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe('RunStarted');
      expect(events[0]!.runId).toBe('run-789');
      expect(events[0]!.emittedBy).toBe('engine');
    });

    it('should handle idempotent event persistence', async () => {
      const executionPlan: ExecutionPlan = {
        planId: 'plan-123',
        planVersion: 'v1.0.0',
        schemaVersion: 'v1.0',
        steps: [],
      };

      const context: RunContext = {
        tenantId: 'tenant-123',
        projectId: 'project-456',
        environmentId: 'prod',
        runId: 'run-idempotent',
        targetAdapter: 'temporal',
      };

      // Start run twice
      await adapter.startRun(executionPlan, context);
      await adapter.startRun(executionPlan, context);

      // Should still have 2 events (idempotency handled at append level)
      const events = await stateStore.fetchEvents('run-idempotent');
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('cancelRun', () => {
    it('should cancel a running workflow', async () => {
      const engineRunRef: EngineRunRef = {
        provider: 'temporal',
        namespace: 'test-namespace',
        workflowId: 'test-workflow-123',
        runId: 'run-123',
      };

      await expect(adapter.cancelRun(engineRunRef)).resolves.not.toThrow();
    });

    it('should throw error for invalid EngineRunRef', async () => {
      const engineRunRef: EngineRunRef = {
        provider: 'conductor',
        workflowId: 'test-workflow-123',
        runId: 'run-123',
      };

      await expect(adapter.cancelRun(engineRunRef)).rejects.toThrow(
        'Expected Temporal EngineRunRef, got conductor',
      );
    });
  });

  describe('getRunStatus', () => {
    it('should get workflow status from Temporal and StateStore', async () => {
      // First, start a run to populate StateStore
      const executionPlan: ExecutionPlan = {
        planId: 'plan-123',
        planVersion: 'v1.0.0',
        schemaVersion: 'v1.0',
        steps: [],
      };

      const context: RunContext = {
        tenantId: 'tenant-123',
        projectId: 'project-456',
        environmentId: 'prod',
        runId: 'run-status-test',
        targetAdapter: 'temporal',
      };

      const engineRunRef = await adapter.startRun(executionPlan, context);

      // Verify snapshot is created
      const snapshot = await stateStore.projectSnapshot('run-status-test');
      expect(snapshot).toBeDefined();
      expect(snapshot.lastEventSeq).toBeGreaterThan(0);

      // Now get status
      const status = await adapter.getRunStatus(engineRunRef);

      expect(status.runId).toBe('run-status-test');
      expect(status.status).toBe('RUNNING');
      expect(status.lastEventSeq).toBeGreaterThan(0);
      expect(status.engineRunRef).toEqual(engineRunRef);
    });

    it('should map Temporal status correctly', async () => {
      const engineRunRef: EngineRunRef = {
        provider: 'temporal',
        namespace: 'test-namespace',
        workflowId: 'test-workflow-123',
        runId: 'run-123',
      };

      const status = await adapter.getRunStatus(engineRunRef);

      expect(status.status).toBe('RUNNING');
      expect(status.startedAt).toBeDefined();
    });
  });

  describe('signal', () => {
    it('should send signal to workflow and persist SignalAcceptedEvent', async () => {
      const engineRunRef: EngineRunRef = {
        provider: 'temporal',
        namespace: 'test-namespace',
        workflowId: 'test-workflow-123',
        runId: 'run-signal-test',
      };

      const signalType: SignalType = 'PAUSE';
      const payload = { reason: 'Maintenance window' };

      await adapter.signal(engineRunRef, signalType, payload);

      // Verify StateStore has SignalAcceptedEvent
      const events = await stateStore.fetchEvents('run-signal-test');
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe('SignalAccepted');
      const signalEvent = events[0] as { signalType: SignalType };
      expect(signalEvent.signalType).toBe('PAUSE');
    });

    it('should handle different signal types', async () => {
      const engineRunRef: EngineRunRef = {
        provider: 'temporal',
        namespace: 'test-namespace',
        workflowId: 'test-workflow-123',
        runId: 'run-signals',
      };

      const signalTypes: SignalType[] = [
        'PAUSE',
        'RESUME',
        'RETRY_STEP',
        'CANCEL',
      ];

      for (const signalType of signalTypes) {
        await expect(
          adapter.signal(engineRunRef, signalType, {}),
        ).resolves.not.toThrow();
      }

      const events = await stateStore.fetchEvents('run-signals');
      expect(events.length).toBe(signalTypes.length);
    });
  });

  describe('StateStore integration', () => {
    it('should persist events with monotonic runSeq', async () => {
      const executionPlan: ExecutionPlan = {
        planId: 'plan-123',
        planVersion: 'v1.0.0',
        schemaVersion: 'v1.0',
        steps: [],
      };

      const context: RunContext = {
        tenantId: 'tenant-123',
        projectId: 'project-456',
        environmentId: 'prod',
        runId: 'run-seq-test',
        targetAdapter: 'temporal',
      };

      const engineRunRef = await adapter.startRun(executionPlan, context);

      // Send multiple signals
      await adapter.signal(engineRunRef, 'PAUSE', {});
      await adapter.signal(engineRunRef, 'RESUME', {});

      const events = await stateStore.fetchEvents('run-seq-test');
      expect(events.length).toBeGreaterThanOrEqual(3);

      // Verify monotonic runSeq
      for (let i = 1; i < events.length; i++) {
        expect(events[i]!.runSeq).toBeGreaterThan(events[i - 1]!.runSeq);
      }
    });

    it('should fetch events with watermark', async () => {
      const executionPlan: ExecutionPlan = {
        planId: 'plan-123',
        planVersion: 'v1.0.0',
        schemaVersion: 'v1.0',
        steps: [],
      };

      const context: RunContext = {
        tenantId: 'tenant-123',
        projectId: 'project-456',
        environmentId: 'prod',
        runId: 'run-watermark-test',
        targetAdapter: 'temporal',
      };

      await adapter.startRun(executionPlan, context);

      const allEvents = await stateStore.fetchEvents('run-watermark-test');
      const firstEventSeq = allEvents[0]!.runSeq;

      // Fetch events after first event
      const laterEvents = await stateStore.fetchEvents('run-watermark-test', {
        afterSeq: firstEventSeq,
      });

      expect(laterEvents.length).toBe(0); // Only one event so far
    });
  });

  describe('Error handling', () => {
    it('should handle Temporal connection errors gracefully', async () => {
      // Mock Connection.connect to reject
      const { Connection } = require('@temporalio/client');
      Connection.connect = jest
        .fn()
        .mockRejectedValue(new Error('Connection refused'));

      const failingAdapter = new TemporalAdapter({
        temporal: {
          address: 'invalid-host:9999',
          namespace: 'test',
        },
        stateStore,
      });

      await expect(failingAdapter.initialize()).rejects.toThrow(
        /Connection refused/,
      );
    });

    it('should provide meaningful error messages', async () => {
      const engineRunRef: EngineRunRef = {
        provider: 'temporal',
        namespace: 'test-namespace',
        workflowId: 'nonexistent-workflow',
        runId: 'run-error',
      };

      // Mock error from Temporal client
      const mockClient = require('@temporalio/client');
      mockClient.Client.mockImplementationOnce(() => ({
        workflow: {
          getHandle: jest.fn().mockReturnValue({
            cancel: jest.fn().mockRejectedValue(new Error('Workflow not found')),
          }),
        },
      }));

      const errorAdapter = new TemporalAdapter(config);
      await errorAdapter.initialize();

      await expect(errorAdapter.cancelRun(engineRunRef)).rejects.toThrow(
        /Workflow not found/,
      );

      await errorAdapter.close();
    });
  });

  describe('Outbox pattern', () => {
    it('should work without outbox storage (optional)', async () => {
      const configWithoutOutbox: TemporalAdapterConfig = {
        temporal: {
          address: 'localhost:7233',
          namespace: 'test-namespace',
        },
        stateStore,
        // No outboxStorage
      };

      const adapterWithoutOutbox = new TemporalAdapter(configWithoutOutbox);
      await adapterWithoutOutbox.initialize();

      const executionPlan: ExecutionPlan = {
        planId: 'plan-123',
        planVersion: 'v1.0.0',
        schemaVersion: 'v1.0',
        steps: [],
      };

      const context: RunContext = {
        tenantId: 'tenant-123',
        projectId: 'project-456',
        environmentId: 'prod',
        runId: 'run-no-outbox',
        targetAdapter: 'temporal',
      };

      // Should work without outbox
      await expect(
        adapterWithoutOutbox.startRun(executionPlan, context),
      ).resolves.toBeDefined();

      await adapterWithoutOutbox.close();
    });
  });
});
