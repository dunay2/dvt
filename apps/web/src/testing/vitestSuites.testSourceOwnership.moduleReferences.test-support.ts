/**
 * Owned concern: project conservative and runtime ownership from SourceFacts AST.
 * @decision Keep syntax interpretation independent of filesystem acquisition and ownership closure.
 * @consequence Physical and fixture evidence share the same conservative reference semantics.
 */
import ts from 'typescript';
import { readStaticModuleReference } from './vitestSuites.moduleImports.test-support';
import {
  readModuleCalls,
  type ModuleCall,
} from './vitestSuites.testSourceOwnership.moduleCalls.test-support';

export type TestSourceFacts = { source: ts.SourceFile; importRefs: readonly string[] };

const workerQueries = new Set(
  ['worker', 'sharedworker'].flatMap((query) => [query, `${query}&inline`, `inline&${query}`])
);

export function moduleQueryKind(reference: string): 'plain' | 'source' | 'worker' | 'uncertain' {
  const separator = reference.indexOf('?');
  if (separator === -1) return 'plain';
  const query = reference.slice(separator + 1);
  if (query === 'raw') return 'source';
  return workerQueries.has(query) ? 'worker' : 'uncertain';
}

function conservativeReferences(
  imports: readonly string[],
  explicit: ReadonlySet<string>,
  contextual: ReadonlySet<string>
): Set<string> {
  const references = new Set([...imports, ...explicit]);
  for (const ref of contextual) {
    if (!explicit.has(ref)) references.delete(ref);
  }
  return references;
}

type ReferenceCollection = {
  explicit: Set<string>;
  contextual: Set<string>;
  runtime: Set<string>;
  observation: boolean;
  uncertain: boolean;
};

function recordReference(
  collection: ReferenceCollection,
  specifier: string,
  executes: boolean
): void {
  collection.explicit.add(specifier);
  if (executes) collection.runtime.add(specifier);
}

function recordCall(collection: ReferenceCollection, call: ModuleCall): void {
  if (call.observation) collection.observation = true;
  if (call.kind == null) return;
  if (call.kind === 'contextual') {
    collection.uncertain = true;
    if (call.specifier != null) collection.contextual.add(call.specifier);
    return;
  }
  if (call.specifier == null) collection.uncertain = true;
  else recordReference(collection, call.specifier, call.kind === 'runtime');
}

export function moduleReferences(facts: TestSourceFacts) {
  const collection: ReferenceCollection = {
    explicit: new Set(),
    contextual: new Set(),
    runtime: new Set(),
    observation: false,
    uncertain: false,
  };
  const readCall = readModuleCalls(facts.source);
  function visit(node: ts.Node): void {
    const reference = readStaticModuleReference(node);
    if (reference != null) recordReference(collection, reference.specifier, reference.runtime);
    if (ts.isCallExpression(node)) recordCall(collection, readCall(node));
    ts.forEachChild(node, visit);
  }

  visit(facts.source);
  const { explicit, contextual, runtime, observation, uncertain } = collection;
  return {
    conservative: conservativeReferences(facts.importRefs, explicit, contextual),
    runtime,
    observation,
    uncertain,
  };
}
