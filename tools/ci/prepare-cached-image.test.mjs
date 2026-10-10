/** Owned concern: prove immutable image reuse without trusting cache contents or sharing DB state. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  IMAGE_CACHE_ERROR,
  prepareCachedImage,
  resolveImageCache,
} from './prepare-cached-image.mjs';

const image = resolveImageCache('postgres-15', '/runner/images');
const inspected = { Id: image.configDigest, Os: 'linux', Architecture: 'amd64' };

function dockerHarness(metadata = inspected, failure) {
  const calls = [];
  return {
    calls,
    docker(args) {
      calls.push(args);
      if (args[0] === failure) throw new Error(`Docker ${failure} failed`);
      return args[0] === 'image' ? JSON.stringify([metadata]) : '';
    },
  };
}

test('catalog admits exact platform manifests and isolates keys across images', () => {
  const other = resolveImageCache('postgres-16', '/runner/images');
  assert.match(image.reference, /^postgres:15\.19@sha256:[a-f0-9]{64}$/);
  assert.match(other.reference, /^postgres:16\.15@sha256:[a-f0-9]{64}$/);
  assert.notEqual(image.key, other.key);
  assert.notEqual(image.archive, other.archive);
  assert.equal(image.platform, 'linux/amd64');
  assert.throws(() => resolveImageCache('../unapproved', '/runner'), {
    code: IMAGE_CACHE_ERROR.unknownImage,
  });
});

test('cold preparation pulls exactly once by digest and saves only the verified image', () => {
  const runtime = dockerHarness();
  prepareCachedImage(image, false, runtime.docker);
  assert.deepEqual(runtime.calls, [
    ['pull', '--platform', image.platform, image.reference],
    ['tag', image.reference, image.localReference],
    ['image', 'inspect', image.localReference],
    ['save', '--output', image.archive, image.localReference],
  ]);
});

test('warm preparation loads the archive with zero registry access or re-save', () => {
  const runtime = dockerHarness();
  prepareCachedImage(image, true, runtime.docker);
  assert.deepEqual(runtime.calls, [
    ['load', '--input', image.archive],
    ['image', 'inspect', image.localReference],
  ]);
});

test('both classic config IDs and containerd manifest IDs retain exact identity', () => {
  for (const Id of [image.configDigest, image.reference.split('@')[1]]) {
    const runtime = dockerHarness({ ...inspected, Id });
    assert.doesNotThrow(() => prepareCachedImage(image, true, runtime.docker));
  }
});

test('untrusted image identity and platform fail closed before saving', () => {
  for (const metadata of [
    { ...inspected, Id: `sha256:${'0'.repeat(64)}` },
    { ...inspected, Architecture: 'arm64' },
    { ...inspected, Os: 'windows' },
  ]) {
    for (const hit of [false, true]) {
      const runtime = dockerHarness(metadata);
      assert.throws(() => prepareCachedImage(image, hit, runtime.docker), {
        code: IMAGE_CACHE_ERROR.identityMismatch,
      });
      assert.equal(
        runtime.calls.some(([command]) => command === 'save'),
        false
      );
      assert.equal(runtime.calls.filter(([command]) => command === 'pull').length, hit ? 0 : 1);
    }
  }
});

test('failed pull or missing/corrupt archive never retries or falls back to a mutable tag', () => {
  for (const [hit, failure] of [
    [false, 'pull'],
    [true, 'load'],
  ]) {
    const runtime = dockerHarness(inspected, failure);
    assert.throws(() => prepareCachedImage(image, hit, runtime.docker), /Docker .* failed/);
    assert.equal(runtime.calls.length, 1);
  }
});

test('workflows share image-only cache and prohibit implicit pulls at both consumers', () => {
  const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  const action = read('.github/actions/prepare-cached-image/action.yml');
  assert.match(action, /actions\/cache\/restore@[a-f0-9]{40}/);
  assert.match(action, /actions\/cache\/save@[a-f0-9]{40}/);
  assert.doesNotMatch(action, /restore-keys|continue-on-error|postgres-data|\/var\/lib\/docker/);
  assert.match(action, /steps\.restore\.outputs\.cache-hit != 'true'/);
  const planning = read('.github/actions/prepare-planning-db/action.yml');
  assert.match(planning, /uses: \.\/\.github\/actions\/prepare-cached-image/);
  assert.match(planning, /image: postgres-16/);
  assert.match(planning, /planning:db:up --pull never/);
  const web = read('.github/workflows/test.yml');
  assert.match(web, /image: postgres-15/);
  assert.match(web, /docker create --pull=never/);
  assert.match(web, /steps\.browser_image\.outputs\.image/);
});
