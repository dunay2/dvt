/**
 * Owned concern: verify the Temporal PlanRef workflow boundary keeps semantic
 * ownership, public API, invariants, transitions, and consumer documentation.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const WORKFLOW_ROOT = join(import.meta.dirname, '../src/workflows');
const REPO_ROOT = join(import.meta.dirname, '../../../..');
const COMPONENT_GUIDE_PATH = join(
  REPO_ROOT,
  'docs/architecture/components/engine/adapters/temporal/temporal-planref-workflow-boundary.md'
);

const WORKFLOW_COMPONENT_CONCERNS = {
  'RunPlanWorkflow.ts': 'Temporal PlanRef workflow orchestration entrypoint',
  'executionSegmentResolver.ts': 'PlanRef execution-segment projection from canonical plans',
  'runPlanWorkflow.activities.ts': 'Temporal activity proxy binding for workflow ports',
  'runPlanWorkflow.cancellation.ts': 'Runtime-owned cancellation lifecycle settlement',
  'runPlanWorkflow.layerHelpers.ts': 'Layer selection and continue-as-new decision helpers',
  'runPlanWorkflow.layerResults.ts': 'Layer result application and gateway fact retention',
  'runPlanWorkflow.layers.ts': 'Deterministic workflow layer-loop orchestration',
  'runPlanWorkflow.lifecycle.ts': 'Workflow bootstrap, terminal, failure, and rollover outcomes',
  'runPlanWorkflow.signals.ts': 'Runtime control-signal registration and dedupe state',
  'runPlanWorkflow.state.ts': 'Workflow control input parsing and cursor hydration',
  'runPlanWorkflow.stepExecution.ts': 'Per-layer step activity execution orchestration',
  'runPlanWorkflow.types.ts': 'Workflow public API contracts and runtime state model',
  'workflowArtifactHelpers.ts': 'Execution artifact payload interpretation',
  'workflowControlSignalRetentionPolicy.ts':
    'Bounded retention policy for control-signal dedupe ids across workflow continuation',
  'workflowCursorHelpers.ts': 'Compact continue-as-new cursor construction and payload guard',
  'workflowErrorHelpers.ts': 'Workflow-safe error-message normalization',
  'workflowGatewayHelpers.ts': 'Gateway dependency validation and fact lookup',
  'workflowInputParsingHelpers.ts': 'Deterministic workflow input primitive parsing',
  'workflowRuntimePayloadHelpers.ts': 'Runtime event payload shaping',
} as const;

describe('Temporal PlanRef workflow component semantics', () => {
  it('states the exact owned concern at the top of every workflow boundary module', () => {
    for (const [fileName, concern] of Object.entries(WORKFLOW_COMPONENT_CONCERNS)) {
      const source = readWorkflowSource(fileName);

      expect(source).toMatch(
        new RegExp(`^/\\*\\*[\\s\\S]*\\* @ownedConcern ${escapeRegExp(concern)}[\\s\\S]*\\*/`)
      );
    }
  });

  it('publishes the component API, invariants, transitions, consumers, and diagrams', () => {
    expect(existsSync(COMPONENT_GUIDE_PATH)).toBe(true);

    const guide = readFileSync(COMPONENT_GUIDE_PATH, 'utf8');

    expect(guide).toContain('# Temporal PlanRef workflow boundary component');
    expect(guide).toContain('## Public API');
    expect(guide).toContain('## Invariants');
    expect(guide).toContain('## Transitions');
    expect(guide).toContain('## Consumers');
    expect(guide).toContain('## Component map');
    expect(guide).toContain('## Diagrams');
    expect(guide).toContain('```mermaid');
    expect(guide).toContain('RunPlanWorkflowInput');
    expect(guide).toContain('continueAsNewAfterLayerCount: number');
    expect(guide).toContain('PlanRef plus compact cursor');
    expect(guide).toContain('full `ExecutionPlan` MUST NOT cross');
    expect(guide).toContain('apps/api provider-adapter factory');
    expect(guide).toContain('apps/temporal-worker runtime host');
  });

  it('keeps durable workflow input on PlanRef plus control budget, not full ExecutionPlan', () => {
    const typesSource = readWorkflowSource('runPlanWorkflow.types.ts');
    const inputInterface = extractInterface(typesSource, 'RunPlanWorkflowInput');

    expect(inputInterface).toContain('planRef: WorkflowPlanRef');
    expect(inputInterface).toContain('ctx: WorkflowCtx');
    expect(inputInterface).toContain('maxContinueAsNewPayloadBytes: number');
    expect(inputInterface).toContain('continueAsNewAfterLayerCount: number');
    expect(inputInterface).toContain('cursor?: WorkflowExecutionCursor');
    expect(inputInterface).not.toContain('ExecutionPlan');
    expect(inputInterface).not.toContain('steps:');
  });

  it('parses control input before resolving the first segment and uses the cursor layer', () => {
    const workflowSource = readWorkflowSource('RunPlanWorkflow.ts');

    const parseIndex = workflowSource.indexOf('const ctrl = parseWorkflowControlInput(input);');
    const firstResolveIndex = workflowSource.indexOf(
      'const firstSegment = await segmentActivities.resolveExecutionSegment({'
    );
    const cursorLayerIndex = workflowSource.indexOf('layerIndex: ctrl.nextLayerIndex');

    expect(parseIndex).toBeGreaterThanOrEqual(0);
    expect(firstResolveIndex).toBeGreaterThan(parseIndex);
    expect(cursorLayerIndex).toBeGreaterThan(firstResolveIndex);
  });
});

function readWorkflowSource(fileName: string): string {
  return readFileSync(join(WORKFLOW_ROOT, fileName), 'utf8');
}

function extractInterface(source: string, interfaceName: string): string {
  const match = new RegExp(`export interface ${interfaceName} \\{[\\s\\S]*?\\n\\}`).exec(source);
  if (match === null) {
    throw new Error(`Missing interface ${interfaceName}`);
  }

  return match[0];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
