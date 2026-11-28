/** @ownedConcern Build executable evidence for supported API deployment profiles. */
import { collectProductionExecutableScopes } from './api-executable-scopes.mjs';
import {
  API_PRODUCTION_ROOTS,
  API_REACHABILITY_CLASSIFICATIONS,
} from './api-reachability-policy.mjs';
import { isStaticallyReachable } from './control-flow-reachability.mjs';
import { indexCruiseModules, normalizeCruiseModules } from './cruise-module-graph.mjs';
import { importedSymbolTarget } from './module-symbol-references.mjs';
import {
  containsIdentifier,
  containsReachableCall,
  containsReachableDynamicImport,
  containsReachableNullReturn,
  containsReachableReturnCall,
  findNamedExecutableScope,
  hasReachableEnabledTarget,
  isDynamicImportOf,
} from './reachable-syntax.mjs';
import { hasReachableReconcilerEnabledPath } from './reconciler-profile-paths.mjs';
import {
  collectDescendants,
  enclosingClassOrExecutableScope,
  enclosingExecutableScope,
  executableScopeKey,
  sourceFileFor,
  ts,
} from './typescript-source.mjs';

const CONDITIONAL = API_REACHABILITY_CLASSIFICATIONS.conditionalProduction;
const NULL_OBJECT = API_REACHABILITY_CLASSIFICATIONS.validNullObject;
const OIDC_VARIABLES = ['OIDC_JWKS_URI', 'OIDC_ISSUER', 'OIDC_AUDIENCE'];
const PROTECTED_RUNTIME = 'buildProtectedRuntimeModule';

function witness(profile, proof, source, classification = CONDITIONAL) {
  return { profile, classification, proof, source };
}

function isOtelConstruction(node) {
  if (!ts.isNewExpression(node)) return false;
  return ts.isIdentifier(node.expression) && node.expression.text === 'OtelObservability';
}

function observeObservability({ source, statement, scope }) {
  if (!containsIdentifier(statement.expression, 'OBS_ENABLED')) return [];
  if (!containsReachableReturnCall(statement.thenStatement, 'createNoopObservability')) return [];

  const evidence = [
    witness(
      'observability-noop',
      'OBS_ENABLED=false branch returns createNoopObservability()',
      source,
      NULL_OBJECT
    ),
  ];
  if (hasReachableEnabledTarget(scope, statement, isOtelConstruction)) {
    evidence.push(
      witness('observability-otel', 'OBS_ENABLED=true branch constructs OtelObservability', source)
    );
  }
  return evidence;
}

function protectedStorageWitness(source, parsedBySource, scopes) {
  const parsed = parsedBySource.get(source);
  if (!parsed) return [];
  const scope = findNamedExecutableScope(parsed, PROTECTED_RUNTIME);
  if (!scope || !scopes.has(executableScopeKey(source, scope))) return [];
  if (!containsReachableDynamicImport(scope, '@dvt/adapter-postgres')) return [];
  return [
    witness(
      'postgres-protected-storage',
      'OIDC-protected composition dynamically loads @dvt/adapter-postgres',
      source
    ),
  ];
}

function observeOidc({ source, parsed, statement, moduleMap, parsedBySource, scopes }) {
  if (!OIDC_VARIABLES.every((name) => containsIdentifier(statement.expression, name))) return [];
  if (!containsReachableCall(statement.thenStatement, PROTECTED_RUNTIME)) return [];

  const target = importedSymbolTarget(moduleMap.get(source), parsed, PROTECTED_RUNTIME) ?? source;
  const evidence = [
    witness(
      'oidc-protected-runtime',
      'complete OIDC branch calls buildProtectedRuntimeModule()',
      target
    ),
  ];
  if (statement.elseStatement) {
    evidence.push(
      witness('oidc-public-only', 'OIDC branch has an explicit public-only alternative', source)
    );
  }
  return [...evidence, ...protectedStorageWitness(target, parsedBySource, scopes)];
}

function observeReconciler({ source, parsed, statement }) {
  if (!containsIdentifier(statement.expression, 'DVT_INTENT_RECONCILER_ENABLED')) return [];
  if (!containsReachableNullReturn(statement.thenStatement)) return [];

  const scope = enclosingClassOrExecutableScope(statement, parsed);
  const evidence = [
    witness('reconciler-disabled', 'disabled reconciler branch returns no runtime handle', source),
  ];
  if (hasReachableReconcilerEnabledPath(scope, statement, parsed)) {
    evidence.push(
      witness('reconciler-enabled', 'enabled reconciler path composes the worker runtime', source)
    );
  }
  return evidence;
}

function observeTemporal({ source, statement, scope }) {
  if (!containsIdentifier(statement.expression, 'TEMPORAL_ADDRESS')) return [];
  if (!containsReachableNullReturn(statement.thenStatement)) return [];
  const importsProvider = (node) => isDynamicImportOf(node, '@dvt/adapter-temporal');
  if (!hasReachableEnabledTarget(scope, statement, importsProvider)) return [];
  return [
    witness(
      'temporal-provider',
      'configured Temporal branch dynamically loads @dvt/adapter-temporal',
      source
    ),
  ];
}

const PROFILE_OBSERVERS = [observeObservability, observeOidc, observeReconciler, observeTemporal];

function observeSource(source, parsed, context) {
  const statements = collectDescendants(parsed, ts.isIfStatement);
  return statements.flatMap((statement) => {
    const scope = enclosingExecutableScope(statement, parsed);
    if (!context.scopes.has(executableScopeKey(source, scope))) return [];
    if (!isStaticallyReachable(statement, scope)) return [];
    const input = { ...context, source, parsed, statement, scope };
    return PROFILE_OBSERVERS.flatMap((observe) => observe(input));
  });
}

function aggregateEvidence(observations) {
  const evidence = new Map();
  for (const { profile, classification, proof, source } of observations) {
    const sources = new Set(evidence.get(profile)?.sources);
    sources.add(source);
    evidence.set(profile, { profile, classification, proof, sources: [...sources].sort() });
  }
  return [...evidence.values()].sort((left, right) => left.profile.localeCompare(right.profile));
}

export function collectApiDeploymentProfileEvidence({
  modules,
  productionSources,
  sourceContents,
  productionRoots = API_PRODUCTION_ROOTS,
}) {
  const moduleMap = indexCruiseModules(normalizeCruiseModules(modules));
  const parsedBySource = new Map(
    [...productionSources].sort().flatMap((source) => {
      const contents = sourceContents.get(source);
      return contents ? [[source, sourceFileFor(source, contents)]] : [];
    })
  );
  const scopes = collectProductionExecutableScopes({ moduleMap, parsedBySource, productionRoots });
  const context = { moduleMap, parsedBySource, scopes };
  return aggregateEvidence(
    [...parsedBySource].flatMap(([source, parsed]) => observeSource(source, parsed, context))
  );
}
