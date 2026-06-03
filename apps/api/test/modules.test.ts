import { describeBuildProtectedRuntimeModuleCases } from './modules/buildProtectedRuntimeModule.cases.js';
import { describeBuildProviderAdaptersCases } from './modules/buildProviderAdapters.cases.js';
import { describePlanCompileBoundaryCases } from './modules/planCompileBoundary.cases.js';
import { describeProtectedRuntimeAndPlanCompileArchitectureCases } from './modules/protectedRuntimeAndPlanCompileArchitecture.cases.js';
import { describeProtectedRuntimeDependencyBuildersCases } from './modules/protectedRuntimeDependencyBuilders.cases.js';
import { describeRegisterOperationalHooksCases } from './modules/registerOperationalHooks.cases.js';
import { describeStartRunRuntimeCompositionCases } from './modules/startRunRuntimeComposition.cases.js';
import { describeWorkspaceGraphDraftRuntimeCompositionCases } from './modules/workspaceGraphDraftRuntimeComposition.cases.js';

/**
 * Stable test anchor for historical docs and evidence that reference
 * `apps/api/test/modules.test.ts`.
 *
 * The real cases now live in smaller companion files grouped by module
 * responsibility.
 */
describeBuildProtectedRuntimeModuleCases();
describeRegisterOperationalHooksCases();
describeBuildProviderAdaptersCases();
describePlanCompileBoundaryCases();
describeProtectedRuntimeAndPlanCompileArchitectureCases();
describeProtectedRuntimeDependencyBuildersCases();
describeStartRunRuntimeCompositionCases();
describeWorkspaceGraphDraftRuntimeCompositionCases();
