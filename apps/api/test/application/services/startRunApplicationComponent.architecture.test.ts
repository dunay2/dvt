import { describe, expect, it } from 'vitest';

import { START_RUN_APPLICATION_COMPONENT } from './applicationArchitectureAst.support.js';

const { artifacts, contracts } = START_RUN_APPLICATION_COMPONENT;
const OWNED_COMPONENT_ARTIFACTS = [
  artifacts.useCasePort,
  artifacts.facadePort,
  artifacts.engineErrorTypes,
  artifacts.targetAdapterRegistryPort,
  artifacts.authorizedFacade,
  artifacts.backpressureUseCase,
  artifacts.plannerBackedUseCase,
  artifacts.engineBridge,
  artifacts.engineUseCase,
  artifacts.targetAdapterRegistry,
];
const CANONICAL_START_RUN_IMPORT_CASES = [
  {
    artifact: artifacts.useCasePort,
    imports: ['StartRunCommand', 'StartRunResult'],
  },
  {
    artifact: artifacts.facadePort,
    imports: [
      'START_RUN_RESULT_KIND',
      'StartRunAcceptedResult',
      'StartRunDuplicateResult',
      'StartRunPlanRejectedResult',
      'StartRunRateLimitedResult',
      'StartRunSystemBackpressureResult',
      'StartRunTenantBackpressureResult',
    ],
  },
  {
    artifact: artifacts.backpressureUseCase,
    imports: [
      'START_RUN_DUPLICATE_OF',
      'START_RUN_RESULT_KIND',
      'StartRunCommand',
      'StartRunResult',
    ],
  },
  {
    artifact: artifacts.plannerBackedUseCase,
    imports: ['START_RUN_RESULT_KIND', 'StartRunCommand', 'StartRunPlanRef'],
  },
  {
    artifact: artifacts.engineBridge,
    imports: [
      'START_RUN_DUPLICATE_OF',
      'START_RUN_PLAN_REJECTION_CODE',
      'START_RUN_RATE_LIMIT_CODE',
      'START_RUN_RESULT_KIND',
      'StartRunAcceptedResult',
      'StartRunCommand',
      'StartRunPlanRef',
    ],
  },
  {
    artifact: artifacts.targetAdapterRegistry,
    imports: ['SUPPORTED_START_RUN_TARGET_ADAPTERS', 'StartRunTargetAdapter'],
  },
] as const;
const CANONICAL_START_RUN_COMMAND_IMPORT_ARTIFACTS = [
  artifacts.authorizedFacade,
  artifacts.routeCommandBuilder,
  artifacts.routeParser,
  artifacts.routeTargetAdapterParser,
] as const;

describe('Start-run application component architecture', () => {
  it('ships a local component guide with API, invariants, transitions, and consumers', () => {
    expect(artifacts.componentGuide.exists()).toBe(true);

    const docText = artifacts.componentGuide.readText();
    for (const section of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
    ]) {
      expect(docText).toContain(section);
    }
    expect(docText).toContain('```mermaid');
  });

  it('states owned concern docblocks on the start-run component modules', () => {
    for (const artifact of OWNED_COMPONENT_ARTIFACTS) {
      expect(artifact.hasOwnedConcernDocblock()).toBe(true);
    }
  });

  it('removes app-local command/result shim modules so the canonical boundary has one import path', () => {
    expect(artifacts.commandContractShim.exists()).toBe(false);
    expect(artifacts.resultContractShim.exists()).toBe(false);
    expect(artifacts.aggregateContractShim.exists()).toBe(false);
  });

  it('keeps service-level start-run suites split by responsibility', () => {
    expect(artifacts.backpressureMonolithTest.exists()).toBe(false);
    expect(artifacts.authorizedFacadeMonolithTest.exists()).toBe(false);
    expect(artifacts.engineUseCaseMonolithTest.exists()).toBe(false);

    for (const artifact of [
      artifacts.backpressureDuplicateFlowTest,
      artifacts.backpressureAdmissionModesTest,
      artifacts.backpressureExecutionCapacityTest,
      artifacts.backpressureTestSupport,
      artifacts.authorizedFacadeAuthTest,
      artifacts.authorizedFacadeEnginePassThroughTest,
      artifacts.authorizedFacadeTestSupport,
      artifacts.engineUseCaseCommandPathTest,
      artifacts.engineUseCaseErrorMappingTest,
      artifacts.engineUseCaseTestSupport,
    ]) {
      expect(artifact.exists()).toBe(true);
    }
  });

  it('imports canonical start-run boundary types directly from @dvt/contracts', () => {
    for (const { artifact, imports } of CANONICAL_START_RUN_IMPORT_CASES) {
      expect(artifact.readSource().hasAllNamedImports(contracts.canonicalBoundaryModule, imports)).toBe(
        true
      );
    }

    for (const artifact of CANONICAL_START_RUN_COMMAND_IMPORT_ARTIFACTS) {
      expect(
        artifact.readSource().hasNamedImport({
          importedName: 'StartRunCommand',
          moduleSpecifier: contracts.canonicalBoundaryModule,
        })
      ).toBe(true);
    }

    expect(
      artifacts.targetAdapterRegistryPort
        .readSource()
        .hasNamedImport({
          importedName: 'StartRunTargetAdapter',
          moduleSpecifier: contracts.canonicalBoundaryModule,
        })
    ).toBe(true);
  });

  it('keeps engine translation inside the dedicated engine bridge helper', () => {
    expect(artifacts.engineBridge.exists()).toBe(true);
    expect(artifacts.engineBridge.hasOwnedConcernDocblock()).toBe(true);

    expect(
      artifacts.engineUseCase
        .readSource()
        .hasAllNamedImports('./startRunEngineBridge.js', [
          'mapEngineStartRunError',
          'toAcceptedStartRunResult',
          'toEnginePlanRef',
          'toEngineRunContext',
          'validateStartRunPlanRef',
        ])
    ).toBe(true);

    expect(artifacts.engineUseCase.readSource().collectNamedImports('@dvt/engine')).toEqual([
      'IWorkflowEngine',
    ]);
    expect(artifacts.engineUseCase.readText()).not.toContain('AdapterNotRegisteredError');
    expect(artifacts.engineUseCase.readText()).not.toContain('RunAlreadyExistsError');
    expect(artifacts.engineUseCase.readText()).not.toContain('OutboxRateLimitExceededError');
    expect(artifacts.engineUseCase.readText()).not.toContain('RunExecutionContextRejectedError');
  });
});
