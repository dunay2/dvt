import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseReleaseCandidateAuthorityArguments,
  runReleaseCandidateAuthorityCli,
} from './releaseCandidateAuthorityCli.mjs';

const headSha = 'a'.repeat(40);
const mergeSha = 'b'.repeat(40);

const argv = [
  '--base-ref',
  'main',
  '--head-ref',
  'feature/product-change',
  '--base-repository',
  'dunay2/dvt',
  '--head-repository',
  'contributor/dvt',
  '--head-sha',
  headSha,
  '--merge-sha',
  mergeSha,
];

test('CLI parser maps every trusted event field exactly once', () => {
  assert.deepEqual(parseReleaseCandidateAuthorityArguments(argv), {
    baseRef: 'main',
    headRef: 'feature/product-change',
    baseRepository: 'dunay2/dvt',
    headRepository: 'contributor/dvt',
    headSha,
    mergeSha,
  });

  assert.throws(
    () => parseReleaseCandidateAuthorityArguments([...argv, '--head-sha', headSha]),
    /Duplicate release candidate authority argument/u
  );
  assert.throws(
    () => parseReleaseCandidateAuthorityArguments([...argv, '--unexpected', 'value']),
    /Unknown release candidate authority argument/u
  );
  assert.throws(
    () => parseReleaseCandidateAuthorityArguments(argv.slice(0, -4)),
    /requires --base-ref/u
  );
});

test('CLI emits exactly one JSON classification for workflow consumption', async () => {
  const output = [];
  const exitCode = await runReleaseCandidateAuthorityCli(argv, {
    write: (value) => output.push(value),
  });

  assert.equal(exitCode, 0);
  assert.equal(output.length, 1);
  assert.deepEqual(JSON.parse(output[0]), {
    pullRequestKind: 'product',
    repositoryScope: 'fork',
    assessmentDisposition: 'not_applicable',
    publicationSha: mergeSha,
    rejectionCode: null,
  });
});

test('CLI preserves an empty optional merge SHA for same-repository classification', async () => {
  const output = [];
  const sameRepositoryArguments = argv.map((value, index) => {
    if (argv[index - 1] === '--head-repository') return 'dunay2/dvt';
    if (argv[index - 1] === '--merge-sha') return '';
    return value;
  });

  await runReleaseCandidateAuthorityCli(sameRepositoryArguments, {
    write: (value) => output.push(value),
  });

  assert.equal(JSON.parse(output[0]).publicationSha, headSha);
});
