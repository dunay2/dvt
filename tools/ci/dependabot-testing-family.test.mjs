/**
 * Owned concern: verify that dependency proposals preserve the declared testing family.
 * Reason to change: tracked dependency declarations or the supported grouping policy change.
 * Corner: reject split families and unused patterns without banning another testing framework.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const root = fileURLToPath(new URL('../..', import.meta.url));
const manifests = execFileSync('git', ['ls-files', '-z', '--', 'package.json', '**/package.json'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\0')
  .filter(Boolean)
  .map((file) => ({ file, manifest: JSON.parse(readFileSync(path.join(root, file), 'utf8')) }));
const config = yaml.load(readFileSync(path.join(root, '.github/dependabot.yml'), 'utf8'));
const npm = config.updates.find((update) => update['package-ecosystem'] === 'npm');
const updateTypes = ['patch', 'minor', 'major'];
const isVitest = (name) => name === 'vitest' || name.startsWith('@vitest/');

function declaredDependencies(inputs) {
  return inputs.flatMap(({ file, manifest }) =>
    [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
      'pnpm.overrides',
    ].flatMap((section) => {
      const values = section === 'pnpm.overrides' ? manifest.pnpm?.overrides : manifest[section];
      return Object.entries(values ?? {}).map(([name, version]) => ({
        file,
        section,
        name,
        version,
      }));
    })
  );
}

function dependencyMatches(pattern, name) {
  const escaped = pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));
  return new RegExp(`^${escaped.join('.*')}$`, 'u').test(name);
}

function firstVersionUpdateGroup(update, name, type) {
  return Object.entries(update.groups).find(
    ([, group]) =>
      (group['applies-to'] ?? 'version-updates') === 'version-updates' &&
      (group['update-types'] ?? updateTypes).includes(type) &&
      group.patterns.some((pattern) => dependencyMatches(pattern, name)) &&
      !(group['exclude-patterns'] ?? []).some((pattern) => dependencyMatches(pattern, name))
  )?.[0];
}

function assertTestingFamily(update, declarations) {
  const names = new Set(
    declarations
      .filter(({ name }) => isVitest(name) || name.startsWith('@testing-library/'))
      .map(({ name }) => name)
  );
  assert.ok(names.has('vitest') && names.has('@vitest/coverage-v8') && names.has('@vitest/ui'));
  for (const name of names) {
    assert.ok(
      !(update.ignore ?? []).some((rule) => dependencyMatches(rule['dependency-name'], name)),
      `${name} must remain eligible for dependency updates`
    );
    for (const type of updateTypes) {
      assert.equal(firstVersionUpdateGroup(update, name, type), 'testing', `${name}:${type}`);
    }
  }
}

function assertVitestVersions(declarations) {
  const runner = declarations.find(
    ({ file, section, name }) =>
      file === 'package.json' && section === 'devDependencies' && name === 'vitest'
  );
  assert.match(runner?.version ?? '', /^\d+\.\d+\.\d+$/u, 'root Vitest runner must be pinned');
  for (const { file, section, name, version } of declarations.filter(({ name }) =>
    isVitest(name)
  )) {
    assert.equal(version, runner.version, `${file}:${section}:${name} must match the root runner`);
  }
}

function assertTestingPatternConsumers(update, declarations) {
  for (const pattern of update.groups.testing.patterns) {
    assert.ok(
      declarations.some(({ name }) => dependencyMatches(pattern, name)),
      `${pattern} must match a declared dependency`
    );
  }
}

const declarations = declaredDependencies(manifests);

test('every declared Vitest dependency shares the testing group at every update level', () => {
  assertTestingFamily(npm, declarations);
});

test('Vitest manifests and overrides use the root runner version', () => {
  assertVitestVersions(declarations);
});

test('every testing pattern has a declared consumer', () => {
  assertTestingPatternConsumers(npm, declarations);
  const future = structuredClone(npm);
  future.groups.testing.patterns.push('jest');
  assertTestingPatternConsumers(future, [...declarations, { name: 'jest' }]);
});

test('a testing pattern without declared consumers is rejected', () => {
  const withoutRunner = declarations.filter(({ name }) => name !== 'vitest');
  assert.throws(
    () => assertTestingPatternConsumers(npm, withoutRunner),
    /vitest must match a declared dependency/u
  );
});

test('an omitted Vitest wildcard is rejected', () => {
  const changed = structuredClone(npm);
  changed.groups.testing.patterns = changed.groups.testing.patterns.filter(
    (value) => value !== '@vitest/*'
  );
  assert.throws(() => assertTestingFamily(changed, declarations), /@vitest\/coverage-v8:patch/u);
});

test('an excluded provider is rejected', () => {
  const changed = structuredClone(npm);
  changed.groups.testing['exclude-patterns'] = ['@vitest/coverage-v8'];
  assert.throws(() => assertTestingFamily(changed, declarations), /@vitest\/coverage-v8:patch/u);
});

test('an earlier group cannot capture the provider', () => {
  const changed = structuredClone(npm);
  changed.groups = { earlier: { patterns: ['@vitest/coverage-v8'] }, ...changed.groups };
  assert.throws(() => assertTestingFamily(changed, declarations), /@vitest\/coverage-v8:patch/u);
});

test('testing-library patch/minor capture and ignores are rejected', () => {
  const captured = structuredClone(npm);
  captured.groups = {
    earlier: { patterns: ['@testing-library/*'], 'update-types': ['patch', 'minor'] },
    ...captured.groups,
  };
  assert.throws(() => assertTestingFamily(captured, declarations), /@testing-library\/dom:patch/u);
  const ignored = structuredClone(npm);
  ignored.ignore = [...(ignored.ignore ?? []), { 'dependency-name': '@testing-library/*' }];
  assert.throws(() => assertTestingFamily(ignored, declarations), /must remain eligible/u);
});

test('family ignores and restricted major updates are rejected', () => {
  const ignored = structuredClone(npm);
  ignored.ignore = [...(ignored.ignore ?? []), { 'dependency-name': '@vitest/*' }];
  assert.throws(() => assertTestingFamily(ignored, declarations), /must remain eligible/u);
  const restricted = structuredClone(npm);
  restricted.groups.testing['update-types'] = ['patch', 'minor'];
  assert.throws(() => assertTestingFamily(restricted, declarations), /vitest:major/u);
});

for (const [label, select] of [
  [
    'provider',
    ({ file, section, name }) =>
      file === 'package.json' && section === 'devDependencies' && name === '@vitest/coverage-v8',
  ],
  [
    'UI',
    ({ file, section, name }) =>
      file === 'package.json' && section === 'devDependencies' && name === '@vitest/ui',
  ],
  ['override', ({ section, name }) => section === 'pnpm.overrides' && name === '@vitest/runner'],
  ['workspace', ({ file, name }) => file !== 'package.json' && name === 'vitest'],
]) {
  test(`an isolated ${label} version is rejected`, () => {
    const changed = structuredClone(declarations);
    const selected = changed.find(select);
    assert.ok(selected, `${label} fixture must identify a real declaration`);
    selected.version += '-isolated';
    assert.throws(() => assertVitestVersions(changed), /must match the root runner/u);
  });
}
