/**
 * Owned concern: verify the AR-C3-A execution-capacity admission component
 * keeps its semantic boundary, not just its import shape.
 */
import { describe, expect, it } from 'vitest';

import { START_RUN_EXECUTION_CAPACITY_ADMISSION_COMPONENT } from './applicationArchitectureAst.support.js';

const { artifacts, contracts } = START_RUN_EXECUTION_CAPACITY_ADMISSION_COMPONENT;
const OWNED_COMPONENT_ARTIFACTS = [
  artifacts.port,
  artifacts.defaultBinding,
  artifacts.decisions,
  artifacts.backpressureUseCase,
  artifacts.runtimeBuilder,
];

describe('Start-run execution-capacity admission architecture', () => {
  it('ships a documented component seam with explicit port and default binding modules', () => {
    expect(artifacts.port.exists()).toBe(true);
    expect(artifacts.defaultBinding.exists()).toBe(true);
    expect(artifacts.componentGuide.exists()).toBe(true);
  });

  it('states owned concern docblocks on the component modules', () => {
    for (const artifact of OWNED_COMPONENT_ARTIFACTS) {
      expect(artifact.hasOwnedConcernDocblock()).toBe(true);
    }
  });

  it('documents fail-closed semantics and bans provider-vocabulary leakage in the local guide', () => {
    const guideText = artifacts.componentGuide.readText();

    expect(guideText).toContain('the API application layer remains adapter-agnostic');
    expect(guideText).toContain('inability to obtain a concrete capacity signal fails closed');
    expect(guideText).toContain('only composition binds the default implementation');
    expect(guideText).toContain('provider queue-depth or worker-metric vocabulary in `apps/api`');
  });

  it('keeps BackpressureAwareStartRunUseCase on the abstract port and preserves admission ordering', () => {
    const useCaseSource = artifacts.backpressureUseCase.readSource();

    expect(useCaseSource.hasNamedImport(contracts.abstractPortImport)).toBe(true);
    expect(
      useCaseSource.collectNamedImports(contracts.useCaseForbiddenDefaultBindingModule)
    ).toEqual([]);

    const executeStart = useCaseSource.sourceText.indexOf('public async execute(');
    const duplicateHandlerStart = useCaseSource.sourceText.indexOf(
      'private async handleDuplicate('
    );
    const executeMethod = useCaseSource.sourceText.slice(executeStart, duplicateHandlerStart);

    const duplicateIndex = executeMethod.indexOf('duplicateProbe.findExisting');
    const admissionEvaluationIndex = executeMethod.indexOf(
      'const reject = await this.evaluateAdmission('
    );
    const delegateIndex = executeMethod.indexOf(
      'await this.deps.delegate.execute(command, context)'
    );

    const evaluateAdmissionStart = useCaseSource.sourceText.indexOf(
      'private async evaluateAdmission('
    );
    const handleRejectStart = useCaseSource.sourceText.indexOf('private async handleReject(');
    const evaluateAdmissionMethod = useCaseSource.sourceText.slice(
      evaluateAdmissionStart,
      handleRejectStart
    );
    const admissionIndex = evaluateAdmissionMethod.indexOf('admissionGuard.assertAdmissible');
    const capacityIndex = evaluateAdmissionMethod.indexOf('executionCapacity.evaluate');

    expect(duplicateIndex).toBeGreaterThanOrEqual(0);
    expect(admissionEvaluationIndex).toBeGreaterThan(duplicateIndex);
    expect(delegateIndex).toBeGreaterThan(admissionEvaluationIndex);
    expect(admissionIndex).toBeGreaterThanOrEqual(0);
    expect(capacityIndex).toBeGreaterThan(admissionIndex);
  });

  it('keeps the default binding fail-closed and translates denial through canonical system_backpressure codes', () => {
    const defaultBindingSource = artifacts.defaultBinding.readSource();
    const decisionsSource = artifacts.decisions.readSource();

    expect(defaultBindingSource.sourceText).toContain(
      'kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated'
    );
    expect(defaultBindingSource.sourceText).toContain(
      'reason: START_RUN_EXECUTION_CAPACITY_REASON.capacitySignalUnavailable'
    );
    expect(defaultBindingSource.sourceText).not.toContain(
      'kind: START_RUN_EXECUTION_CAPACITY_RESULT_KIND.admissible'
    );

    expect(decisionsSource.sourceText).toContain('kind: START_RUN_RESULT_KIND.systemBackpressure');
    expect(decisionsSource.sourceText).toContain(
      'START_RUN_BACKPRESSURE_CODE.executionCapacityExhausted'
    );
    expect(decisionsSource.sourceText).toContain('START_RUN_BACKPRESSURE_CODE.executorUnavailable');
    expect(decisionsSource.sourceText).toContain(
      'START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable'
    );
  });

  it('reserves the default binding for start-run composition only', () => {
    const builderSource = artifacts.runtimeBuilder.readSource();

    expect(builderSource.hasNamedImport(contracts.defaultBindingImport)).toBe(true);
    expect(builderSource.sourceText).toContain(
      'deps.executionCapacity ?? DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT'
    );
    expect(builderSource.sourceText).toContain('executionCapacity,');
  });
});
