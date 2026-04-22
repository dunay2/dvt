import { describe, expect, it } from 'vitest';

import { START_RUN_EXECUTION_CAPACITY_ADMISSION_COMPONENT } from './applicationArchitectureAst.support.js';

const { artifacts, contracts } = START_RUN_EXECUTION_CAPACITY_ADMISSION_COMPONENT;
const OWNED_COMPONENT_ARTIFACTS = [
  artifacts.port,
  artifacts.defaultBinding,
  artifacts.backpressureUseCase,
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

  it('keeps BackpressureAwareStartRunUseCase on the abstract port and reserves the default binding for composition', () => {
    const useCaseSource = artifacts.backpressureUseCase.readSource();
    const moduleSource = artifacts.runtimeModule.readSource();

    expect(useCaseSource.hasNamedImport(contracts.abstractPortImport)).toBe(true);
    expect(
      useCaseSource.collectNamedImports(contracts.useCaseForbiddenDefaultBindingModule)
    ).toEqual([]);

    expect(moduleSource.hasNamedImport(contracts.defaultBindingImport)).toBe(true);
    expect(
      moduleSource.hasConstructorObjectIdentifierBinding(contracts.runtimeExecutionCapacityBinding)
    ).toBe(true);
  });
});
