/**
 * @file packages/@dvt/adapter-temporal/test/workflowMapper.typecheck.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0003: Execution Model
 * @decision Type-check workflow mapping fixtures against canonical execution plan and task queue contracts
 * @consequence Adapter mapper changes cannot silently weaken DVT plan or queue typing
 * @version 1.2.0
 */
import type { ExecutionPlan } from '@dvt/contracts';

import type { TemporalTaskQueueName } from '../src/config.js';
import { loadTemporalAdapterConfig } from '../src/index.js';
import { toTemporalTaskQueue } from '../src/WorkflowMapper.js';

import { mkLinearPlan } from './helpers/integration/testPlans.js';

const config = loadTemporalAdapterConfig({
  TEMPORAL_NAMESPACE: 'default',
  TEMPORAL_TASK_QUEUE: 'dvt-typecheck',
});

const taskQueue: TemporalTaskQueueName = toTemporalTaskQueue('tenant-a', config);
const plan: ExecutionPlan = mkLinearPlan(1);

void taskQueue;
void plan;
