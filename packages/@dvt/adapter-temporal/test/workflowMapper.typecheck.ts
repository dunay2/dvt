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
