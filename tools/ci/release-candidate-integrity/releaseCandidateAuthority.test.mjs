import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyReleaseCandidateAuthority } from './releaseCandidateAuthority.mjs';

const headSha = 'a'.repeat(40);
const mergeSha = 'b'.repeat(40);

function metadata(overrides = {}) {
  return {
    baseRef: 'main',
    headRef: 'feature/product-change',
    baseRepository: 'dunay2/dvt',
    headRepository: 'dunay2/dvt',
    headSha,
    mergeSha,
    ...overrides,
  };
}

test('same-repository release candidates require assessment on the exact head', () => {
  assert.deepEqual(
    classifyReleaseCandidateAuthority(
      metadata({ headRef: 'release-please--branches--main--components--dvt' })
    ),
    {
      pullRequestKind: 'release_candidate',
      repositoryScope: 'same_repository',
      assessmentDisposition: 'required',
      publicationSha: headSha,
      rejectionCode: null,
    }
  );
});

test('same-repository product pull requests publish a not-applicable result on the head', () => {
  assert.deepEqual(classifyReleaseCandidateAuthority(metadata({ mergeSha: undefined })), {
    pullRequestKind: 'product',
    repositoryScope: 'same_repository',
    assessmentDisposition: 'not_applicable',
    publicationSha: headSha,
    rejectionCode: null,
  });
});

test('fork product pull requests publish on the base-repository test merge commit', () => {
  assert.deepEqual(
    classifyReleaseCandidateAuthority(metadata({ headRepository: 'contributor/dvt' })),
    {
      pullRequestKind: 'product',
      repositoryScope: 'fork',
      assessmentDisposition: 'not_applicable',
      publicationSha: mergeSha,
      rejectionCode: null,
    }
  );
});

test('release candidates fail closed when repository or base authority is invalid', () => {
  assert.deepEqual(
    classifyReleaseCandidateAuthority(
      metadata({
        headRef: 'release-please--branches--main--components--dvt',
        headRepository: 'contributor/dvt',
      })
    ),
    {
      pullRequestKind: 'release_candidate',
      repositoryScope: 'fork',
      assessmentDisposition: 'rejected',
      publicationSha: mergeSha,
      rejectionCode: 'release_candidate_must_be_same_repository',
    }
  );

  assert.deepEqual(
    classifyReleaseCandidateAuthority(
      metadata({
        baseRef: 'develop',
        headRef: 'release-please--branches--main--components--dvt',
      })
    ),
    {
      pullRequestKind: 'release_candidate',
      repositoryScope: 'same_repository',
      assessmentDisposition: 'rejected',
      publicationSha: headSha,
      rejectionCode: 'release_candidate_base_must_be_main',
    }
  );
});

test('classification rejects malformed identity and a fork without a test merge commit', () => {
  assert.throws(
    () => classifyReleaseCandidateAuthority(metadata({ headSha: 'main' })),
    /40-character head SHA/u
  );
  assert.throws(
    () =>
      classifyReleaseCandidateAuthority(
        metadata({ headRepository: 'contributor/dvt', mergeSha: undefined })
      ),
    /40-character test merge SHA/u
  );
  assert.throws(
    () => classifyReleaseCandidateAuthority(metadata({ baseRepository: 'dvt' })),
    /owner\/repository/u
  );
});

test('repository identity comparison follows GitHub case-insensitive semantics', () => {
  assert.equal(
    classifyReleaseCandidateAuthority(
      metadata({ baseRepository: 'Dunay2/DVT', headRepository: 'dunay2/dvt' })
    ).repositoryScope,
    'same_repository'
  );
});
