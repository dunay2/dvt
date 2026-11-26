/** Owned concern: project existing workflow capability flags without acquiring Git facts or paths. */

export function projectContractScope(scope, packageJsonChange) {
  return {
    ...scope,
    contracts_relevant: Boolean(
      scope.contracts_relevant || packageJsonChange.contractCapabilitySensitive
    ),
    determinism_relevant: Boolean(
      scope.determinism_relevant || packageJsonChange.determinismSensitive
    ),
    contract_capability_changed: [
      scope.contracts_relevant,
      scope.determinism_relevant,
      scope.golden_relevant,
      packageJsonChange.contractCapabilitySensitive,
    ].some(Boolean),
    hash_compare_relevant: Boolean(scope.hash_compare_relevant),
  };
}

function projectTemporalScope(scope, runtimeWorkspaceFanout, packageJsonChange) {
  return {
    temporal_changed: Boolean(scope.temporal_changed || runtimeWorkspaceFanout),
    temporal_transformation_changed: Boolean(
      scope.temporal_transformation_changed || runtimeWorkspaceFanout
    ),
    temporal_postgres_changed: Boolean(scope.temporal_postgres_changed || runtimeWorkspaceFanout),
    temporal_capability_changed: [
      scope.temporal_changed,
      scope.temporal_transformation_changed,
      scope.temporal_postgres_changed,
      runtimeWorkspaceFanout,
      packageJsonChange.temporalCapabilitySensitive,
    ].some(Boolean),
  };
}

function projectBuildToolingScope(scope, runtimeWorkspaceFanout, packageJsonChange) {
  return {
    root_build_sensitive: Boolean(
      scope.root_build_sensitive || runtimeWorkspaceFanout || packageJsonChange.rootBuildSensitive
    ),
    ci_tooling_changed: Boolean(scope.ci_tooling_changed || packageJsonChange.ciToolingSensitive),
    governance_tooling_changed: Boolean(
      scope.governance_tooling_changed || packageJsonChange.governanceToolingOnly
    ),
  };
}

export function projectPrQualityScope(
  scope,
  repositoryValidationScope,
  runtimeWorkspaceFanout,
  packageJsonChange
) {
  const { temporal_capability_changed, ...temporalSurfaces } = projectTemporalScope(
    scope,
    runtimeWorkspaceFanout,
    packageJsonChange
  );
  return {
    ...scope,
    ...repositoryValidationScope,
    ...temporalSurfaces,
    ...projectBuildToolingScope(scope, runtimeWorkspaceFanout, packageJsonChange),
    temporal_capability_changed,
    postgres_capability_changed: [
      scope.postgres_capability_changed,
      scope.adapter_postgres_changed,
      scope.temporal_postgres_changed,
      runtimeWorkspaceFanout,
      packageJsonChange.postgresCapabilitySensitive,
    ].some(Boolean),
  };
}

function projectTestExecutionSensitivity(scope, runtimeWorkspaceFanout, packageJsonChange) {
  return {
    rootBuildSensitive: [
      scope.root_build_sensitive,
      scope.root_config,
      runtimeWorkspaceFanout,
      packageJsonChange.rootBuildSensitive,
    ].some(Boolean),
    determinismRelevant: [
      scope.determinism_relevant,
      packageJsonChange.determinismSensitive,
      packageJsonChange.rootBuildSensitive,
    ].some(Boolean),
  };
}

export function projectTestScope(scope, runtimeWorkspaceFanout, packageJsonChange) {
  const { rootBuildSensitive, determinismRelevant } = projectTestExecutionSensitivity(
    scope,
    runtimeWorkspaceFanout,
    packageJsonChange
  );
  return {
    ...scope,
    root_build_sensitive: rootBuildSensitive,
    postgres_capability_changed: Boolean(
      scope.postgres_capability_changed || packageJsonChange.postgresCapabilitySensitive
    ),
    determinism_relevant: determinismRelevant,
    coverage_relevant: [
      scope.coverage_relevant,
      scope.engine,
      determinismRelevant,
      rootBuildSensitive,
    ].some(Boolean),
  };
}

function isSecurityAnalysisRelevant(scope, packageJsonChange) {
  return [
    scope.security_analysis_relevant,
    packageJsonChange.dependencySensitive,
    packageJsonChange.lifecycleSensitive,
    packageJsonChange.rootBuildSensitive,
    packageJsonChange.ciToolingSensitive,
  ].some(Boolean);
}

function isCiToolingContractRelevant(scope, packageJsonChange, hasCryptoContractInput) {
  return Boolean(
    scope.ci_tool_executable_contracts_relevant ||
    hasCryptoContractInput() ||
    packageJsonChange.dependencySensitive ||
    packageJsonChange.ciToolingSensitive ||
    packageJsonChange.governanceToolingOnly
  );
}

export function projectWorkflowScope(
  scope,
  repositoryValidationScope,
  packageJsonChange,
  hasCryptoContractInput
) {
  return {
    ...scope,
    ...repositoryValidationScope,
    security_analysis_relevant: isSecurityAnalysisRelevant(scope, packageJsonChange),
    ci_tool_executable_contracts_relevant: isCiToolingContractRelevant(
      scope,
      packageJsonChange,
      hasCryptoContractInput
    ),
  };
}
