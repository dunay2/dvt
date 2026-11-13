/**
 * Owned concern: acquire conservative physical evidence for Web test-support selection.
 * @decision Reuse SourceFacts and TypeScript resolution; keep unresolved behavior as uncertainty.
 * @consequence An isolated guard gets one fresh snapshot, without runtime-query I/O or FS inference.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire, isBuiltin } from 'node:module';
import { relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import ts from 'typescript';

import { WEB_VITEST_TEST_SOURCE_OWNERS } from '../../vitest.suites';
import {
  moduleQueryKind,
  moduleReferences,
  type TestSourceFacts,
} from './vitestSuites.testSourceOwnership.moduleReferences.test-support';

const readFacts: (input: { path: string; content: string }) => TestSourceFacts = createRequire(
  import.meta.url
)('../../../../scripts/lib/source-code-facts.cjs').readSourceCodeFacts;
const webRoot = process.cwd();
const normalized = (value: string) => value.replaceAll('\\', '/');
const code = /\.(?:[cm]?[jt]sx?)$/;
const test = /\.(?:test|spec)\.tsx?$/;
const architecture = /\.architecture\.test\.tsx?$/;
const cohorts = WEB_VITEST_TEST_SOURCE_OWNERS;
const helpers: readonly string[] = cohorts.flatMap((cohort) => [...cohort.helpers]);
const entries: readonly string[] = cohorts.flatMap((cohort) => [...cohort.entries]);
const config = ts.readConfigFile(resolve(webRoot, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error('Cannot acquire current Web TypeScript configuration');
const compilerOptions = ts.parseJsonConfigFileContent(config.config, ts.sys, webRoot).options;

function acquireSources(): Map<string, TestSourceFacts> {
  const paths = ['src', 'vitest', 'scripts', 'cypress']
    .flatMap((directory) =>
      readdirSync(resolve(webRoot, directory), { recursive: true, withFileTypes: true }).flatMap(
        (entry) => {
          if (entry.isSymbolicLink()) throw new Error('Unproven symbolic source inventory');
          return entry.isFile() && code.test(entry.name)
            ? [resolve(entry.parentPath, entry.name)]
            : [];
        }
      )
    )
    .concat(
      readdirSync(webRoot, { withFileTypes: true }).flatMap((entry) => {
        if (entry.isSymbolicLink() && code.test(entry.name))
          throw new Error('Unproven symbolic source inventory');
        return entry.isFile() && code.test(entry.name) ? [resolve(webRoot, entry.name)] : [];
      })
    );
  return new Map(
    paths.map((path) => [
      normalized(path),
      readFacts({ path, content: readFileSync(path, 'utf8') }),
    ])
  );
}

function closure(graph: ReadonlyMap<string, readonly string[]>, source: string): Set<string> {
  const seen = new Set<string>(),
    pending = [source];
  while (pending.length) {
    const next = pending.pop();
    if (next === undefined || seen.has(next)) continue;
    seen.add(next);
    pending.push(...(graph.get(next) ?? []));
  }
  return seen;
}

export function inspectTestSourceEvidence(sources: ReadonlyMap<string, TestSourceFacts>) {
  const runtime = new Map<string, string[]>(),
    conservative = new Map<string, string[]>();
  const seeds = new Set(helpers.map((helper) => normalized(resolve(webRoot, helper))));
  const uncertainties = new Set<string>();
  const cache = ts.createModuleResolutionCache(webRoot, normalized, compilerOptions);
  const host: ts.ModuleResolutionHost = {
    ...ts.sys,
    fileExists: (file) => sources.has(normalized(resolve(file))) || ts.sys.fileExists(file),
    readFile: (file) =>
      sources.get(normalized(resolve(file)))?.source.text ?? ts.sys.readFile(file),
  };
  for (const [file, facts] of sources) {
    const refs = moduleReferences(facts),
      edges: string[] = [],
      live: string[] = [];
    if (refs.observation) seeds.add(file);
    if (refs.uncertain) uncertainties.add(file);
    for (const ref of refs.conservative) {
      const query = moduleQueryKind(ref);
      if (
        /^(?:node:)?(?:fs(?:\/promises)?|child_process|worker_threads|vm)$/.test(ref) ||
        query === 'source' ||
        query === 'uncertain'
      )
        seeds.add(file);
      if (query === 'uncertain') uncertainties.add(file);
      if (/^(?:node:)?module$/.test(ref)) uncertainties.add(file);
      if (isBuiltin(ref)) continue;
      const reference = ref.split('?', 1)[0];
      if (!reference) {
        uncertainties.add(file);
        continue;
      }
      const resolved = ts.resolveModuleName(
        reference,
        file,
        compilerOptions,
        host,
        cache
      ).resolvedModule;
      if (resolved) {
        const target = normalized(resolve(resolved.resolvedFileName));
        if (sources.has(target)) {
          edges.push(target);
          if (refs.runtime.has(ref) && !ref.includes('?') && !facts.source.isDeclarationFile)
            live.push(target);
        } else if (target.startsWith(normalized(webRoot) + '/') && code.test(target))
          uncertainties.add(file);
      } else {
        let resource = false;
        try {
          const target = createRequire(file).resolve(reference);
          resource = !code.test(target) && statSync(target).isFile();
        } catch {
          // An unresolved asset or module remains uncertainty, never a missing edge proof.
        }
        if (!resource) uncertainties.add(file);
      }
    }
    runtime.set(file, live);
    conservative.set(file, edges);
  }
  uncertainties.forEach((file) => seeds.add(file));
  const roots = [...sources.keys()].filter((file) => test.test(file));
  const observers = roots
    .filter(
      (file) =>
        !architecture.test(file) && [...closure(conservative, file)].some((item) => seeds.has(item))
    )
    .map((file) => normalized(relative(webRoot, file)))
    .sort();
  const owners = new Map(
    helpers.map((helper) => {
      const target = normalized(resolve(webRoot, helper));
      return [
        helper,
        roots
          .filter((root) => closure(runtime, root).has(target))
          .map((root) => normalized(relative(webRoot, root)))
          .sort(),
      ];
    })
  );
  const externalConsumers = [...conservative].flatMap(([importer, edges]) =>
    edges.flatMap((target) => {
      const helper = normalized(relative(webRoot, target));
      return helpers.includes(helper) &&
        ![...helpers, ...entries].includes(normalized(relative(webRoot, importer)))
        ? [{ importer: normalized(relative(webRoot, importer)), helper }]
        : [];
    })
  );
  return {
    observers,
    owners,
    externalConsumers,
    conservative,
    runtime,
    uncertainties: [...uncertainties].map((file) => normalized(relative(webRoot, file))),
  };
}

const started = performance.now();
export const currentTestSourceFacts = acquireSources();
const acquiredMs = performance.now() - started;
const proofAt = performance.now();
export const currentTestSourceEvidence = inspectTestSourceEvidence(currentTestSourceFacts);
console.info(
  '[test-source-ownership]',
  JSON.stringify({
    files: currentTestSourceFacts.size,
    acquiredMs,
    proofMs: performance.now() - proofAt,
    observers: currentTestSourceEvidence.observers,
    uncertaintySeeds: currentTestSourceEvidence.uncertainties,
  })
);
