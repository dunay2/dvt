/**
 * Owned concern: declare the start-run application component artifact map and
 * semantic test contracts.
 */
import { join } from 'node:path';

import { defineArtifact } from './applicationArchitectureAst.artifacts.js';

const APPLICATION_ROOT = join(import.meta.dirname, '../../../src/application');
const DOCS_ROOT = join(import.meta.dirname, '../../../docs');
const ENTRYPOINTS_HTTP_ROOT = join(import.meta.dirname, '../../../src/entrypoints/http');
const MODULES_ROOT = join(import.meta.dirname, '../../../src/modules');

export const START_RUN_EXECUTION_CAPACITY_ADMISSION_COMPONENT = {
  artifacts: {
    backpressureUseCase: defineArtifact(
      APPLICATION_ROOT,
      'services/BackpressureAwareStartRunUseCase.ts'
    ),
    componentGuide: defineArtifact(
      DOCS_ROOT,
      'start-run-execution-capacity-admission-component.md'
    ),
    defaultBinding: defineArtifact(
      APPLICATION_ROOT,
      'services/defaultStartRunExecutionCapacityPort.ts'
    ),
    port: defineArtifact(APPLICATION_ROOT, 'ports/IStartRunExecutionCapacityPort.ts'),
    runtimeBuilder: defineArtifact(
      MODULES_ROOT,
      'startRun/buildProtectedStartRunRuntime.ts'
    ),
  },
  contracts: {
    abstractPortImport: {
      importedName: 'IStartRunExecutionCapacityPort',
      moduleSpecifier: '../ports/IStartRunExecutionCapacityPort.js',
    },
    defaultBindingImport: {
      importedName: 'DEFAULT_START_RUN_EXECUTION_CAPACITY_PORT',
      moduleSpecifier: '../../application/services/defaultStartRunExecutionCapacityPort.js',
    },
    useCaseForbiddenDefaultBindingModule: './defaultStartRunExecutionCapacityPort.js',
  },
} as const;

export const START_RUN_APPLICATION_COMPONENT = {
  artifacts: {
    backpressureAdmissionModesTest: defineArtifact(
      import.meta.dirname,
      'BackpressureAwareStartRunUseCase.admissionModes.test.ts'
    ),
    backpressureDuplicateFlowTest: defineArtifact(
      import.meta.dirname,
      'BackpressureAwareStartRunUseCase.duplicateFlow.test.ts'
    ),
    backpressureExecutionCapacityTest: defineArtifact(
      import.meta.dirname,
      'BackpressureAwareStartRunUseCase.executionCapacity.test.ts'
    ),
    backpressureMonolithTest: defineArtifact(
      import.meta.dirname,
      'BackpressureAwareStartRunUseCase.test.ts'
    ),
    backpressureTestSupport: defineArtifact(
      import.meta.dirname,
      'BackpressureAwareStartRunUseCase.test.support.ts'
    ),
    backpressureUseCase: defineArtifact(
      APPLICATION_ROOT,
      'services/BackpressureAwareStartRunUseCase.ts'
    ),
    componentGuide: defineArtifact(DOCS_ROOT, 'start-run-application-component.md'),
    commandContractShim: defineArtifact(APPLICATION_ROOT, 'ports/startRunCommandContract.ts'),
    engineBridge: defineArtifact(APPLICATION_ROOT, 'services/startRunEngineBridge.ts'),
    engineUseCase: defineArtifact(APPLICATION_ROOT, 'services/engineStartRunUseCase.ts'),
    engineErrorTypes: defineArtifact(APPLICATION_ROOT, 'ports/startRunEngineError.ts'),
    facadePort: defineArtifact(APPLICATION_ROOT, 'ports/startRunFacadePort.ts'),
    aggregateContractShim: defineArtifact(APPLICATION_ROOT, 'ports/startRunContract.ts'),
    authorizedFacade: defineArtifact(APPLICATION_ROOT, 'services/startRunAuthorizedFacade.ts'),
    authorizedFacadeAuthTest: defineArtifact(
      import.meta.dirname,
      'startRunAuthorizedFacade.auth.test.ts'
    ),
    authorizedFacadeEnginePassThroughTest: defineArtifact(
      import.meta.dirname,
      'startRunAuthorizedFacade.enginePassThrough.test.ts'
    ),
    authorizedFacadeMonolithTest: defineArtifact(import.meta.dirname, 'startRunAuthorizedFacade.test.ts'),
    authorizedFacadeTestSupport: defineArtifact(
      import.meta.dirname,
      'startRunAuthorizedFacade.test.support.ts'
    ),
    engineUseCaseCommandPathTest: defineArtifact(
      import.meta.dirname,
      'engineStartRunUseCase.commandPath.test.ts'
    ),
    engineUseCaseErrorMappingTest: defineArtifact(
      import.meta.dirname,
      'engineStartRunUseCase.errorMapping.test.ts'
    ),
    engineUseCaseMonolithTest: defineArtifact(import.meta.dirname, 'engineStartRunUseCase.test.ts'),
    engineUseCaseTestSupport: defineArtifact(
      import.meta.dirname,
      'engineStartRunUseCase.test.support.ts'
    ),
    plannerBackedUseCase: defineArtifact(
      APPLICATION_ROOT,
      'services/PlannerBackedStartRunUseCase.ts'
    ),
    resultContractShim: defineArtifact(APPLICATION_ROOT, 'ports/startRunResultContract.ts'),
    routeCommandBuilder: defineArtifact(ENTRYPOINTS_HTTP_ROOT, 'startRunRouteCommandBuilder.ts'),
    routeParser: defineArtifact(ENTRYPOINTS_HTTP_ROOT, 'startRunRouteParser.ts'),
    routeTargetAdapterParser: defineArtifact(
      ENTRYPOINTS_HTTP_ROOT,
      'startRunRouteTargetAdapterParser.ts'
    ),
    targetAdapterRegistryPort: defineArtifact(
      APPLICATION_ROOT,
      'ports/IStartRunTargetAdapterRegistry.ts'
    ),
    targetAdapterRegistry: defineArtifact(
      APPLICATION_ROOT,
      'services/startRunTargetAdapterRegistry.ts'
    ),
    useCasePort: defineArtifact(APPLICATION_ROOT, 'ports/startRunUseCasePort.ts'),
  },
  contracts: {
    canonicalBoundaryModule: '@dvt/contracts',
  },
} as const;
