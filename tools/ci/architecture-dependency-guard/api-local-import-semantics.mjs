/** @ownedConcern Distinguish meaningful local API imports from declarations without use. */
import { dependencyTargets } from './cruise-module-graph.mjs';
import { importBindingNames, staticImportDeclarations } from './module-symbol-references.mjs';
import { countIdentifier, sourceFileFor } from './typescript-source.mjs';

function updateImportUsage(current, clause, isUsed) {
  if (!clause) {
    current.hasSideEffectOnly = true;
    return;
  }
  const names = importBindingNames(clause);
  const hasRuntimeUse = names.runtime.some(isUsed);
  current.hasRuntimeUse ||= hasRuntimeUse;
  current.hasTypeUse ||= names.all.some(isUsed);
  current.hasUnusedValue ||= names.runtime.length > 0 && !hasRuntimeUse;
}

function emptyUsage(target) {
  return {
    target,
    hasRuntimeUse: false,
    hasTypeUse: false,
    hasSideEffectOnly: false,
    hasUnusedValue: false,
  };
}

export function analyzeLocalImportSemantics(module, contents) {
  const analysis = new Map();
  if (!contents) return analysis;
  const parsed = sourceFileFor(module.source, contents);
  const targets = dependencyTargets(module);
  const isUsed = (name) => countIdentifier(parsed, name) > 1;

  for (const statement of staticImportDeclarations(parsed)) {
    const specifier = statement.moduleSpecifier.text;
    const target = targets.get(specifier);
    if (!/^\.\.?\//u.test(specifier) || !target?.startsWith('apps/api/')) continue;

    const current = analysis.get(specifier) ?? emptyUsage(target);
    updateImportUsage(current, statement.importClause, isUsed);
    analysis.set(specifier, current);
  }
  return analysis;
}

function isTypeOnlyDependency(dependency) {
  return (dependency.dependencyTypes ?? []).some(
    (dependencyType) => dependencyType === 'type-only' || dependencyType === 'type-import'
  );
}

export function isRuntimeDependency(dependency, importAnalysis) {
  if (isTypeOnlyDependency(dependency)) return false;
  if (dependency.dynamic === true) return true;
  return importAnalysis.get(dependency.module)?.hasRuntimeUse ?? true;
}

export function isMeaningfulTypeDependency(dependency, importAnalysis) {
  if (!isTypeOnlyDependency(dependency)) return false;
  return importAnalysis.get(dependency.module)?.hasTypeUse ?? true;
}
