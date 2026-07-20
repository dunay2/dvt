const COMMIT_SHA = /^[0-9a-f]{40}$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const RELEASE_CANDIDATE_PREFIX = 'release-please--branches--';

function requireRef(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`Release candidate authority requires a ${label}.`);
  }
  return value;
}

function requireRepository(value, label) {
  if (!REPOSITORY.test(value ?? '')) {
    throw new TypeError(`Release candidate authority requires an owner/repository ${label}.`);
  }
  return value;
}

function requireCommitSha(value, label) {
  if (!COMMIT_SHA.test(value ?? '')) {
    throw new TypeError(`Release candidate authority requires a 40-character ${label}.`);
  }
  return value;
}

export function classifyReleaseCandidateAuthority(metadata) {
  const baseRef = requireRef(metadata?.baseRef, 'base ref');
  const headRef = requireRef(metadata?.headRef, 'head ref');
  const baseRepository = requireRepository(metadata?.baseRepository, 'base repository');
  const headRepository = requireRepository(metadata?.headRepository, 'head repository');
  const headSha = requireCommitSha(metadata?.headSha, 'head SHA');
  const sameRepository = baseRepository.toLowerCase() === headRepository.toLowerCase();
  const publicationSha = sameRepository
    ? headSha
    : requireCommitSha(metadata?.mergeSha, 'test merge SHA');
  const releaseCandidate = headRef.startsWith(RELEASE_CANDIDATE_PREFIX);

  if (!releaseCandidate) {
    return {
      pullRequestKind: 'product',
      repositoryScope: sameRepository ? 'same_repository' : 'fork',
      assessmentDisposition: 'not_applicable',
      publicationSha,
      rejectionCode: null,
    };
  }

  if (!sameRepository) {
    return {
      pullRequestKind: 'release_candidate',
      repositoryScope: 'fork',
      assessmentDisposition: 'rejected',
      publicationSha,
      rejectionCode: 'release_candidate_must_be_same_repository',
    };
  }

  if (baseRef !== 'main') {
    return {
      pullRequestKind: 'release_candidate',
      repositoryScope: 'same_repository',
      assessmentDisposition: 'rejected',
      publicationSha,
      rejectionCode: 'release_candidate_base_must_be_main',
    };
  }

  return {
    pullRequestKind: 'release_candidate',
    repositoryScope: 'same_repository',
    assessmentDisposition: 'required',
    publicationSha,
    rejectionCode: null,
  };
}
