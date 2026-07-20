export const RELEASE_CANDIDATE_CHECK_NAME = 'Release candidate integrity';

const COMMIT_SHA = /^[0-9a-f]{40}$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const ALLOWED_CONCLUSIONS = new Set(['success', 'failure']);

function requireRepository(repository) {
  if (!REPOSITORY.test(repository ?? '')) {
    throw new TypeError('Release candidate check publication requires an owner/repository name.');
  }
}

function requireHeadSha(headSha) {
  if (!COMMIT_SHA.test(headSha ?? '')) {
    throw new TypeError('Release candidate check publication requires a 40-character commit SHA.');
  }
}

function requireCheckRunId(checkRunId) {
  if (!Number.isSafeInteger(checkRunId) || checkRunId <= 0) {
    throw new TypeError('Release candidate check publication requires a positive check-run ID.');
  }
}

function requirePublicationIdentity(result, { checkRunId, headSha }) {
  requireCheckRunId(result?.id);
  if (checkRunId !== undefined && result.id !== checkRunId) {
    throw new Error('GitHub returned a different release candidate check-run identity.');
  }
  if (result.name !== RELEASE_CANDIDATE_CHECK_NAME || result.headSha !== headSha) {
    throw new Error(
      'Release candidate check publication is not attached to the authoritative pull request head.'
    );
  }
  return result;
}

export async function beginReleaseCandidateIntegrityCheck(command, { createCheckRun }) {
  requireRepository(command.repository);
  requireHeadSha(command.headSha);
  if (!URL.canParse(command.detailsUrl ?? '') || !command.externalId) {
    throw new TypeError(
      'Release candidate check publication requires a details URL and external run identity.'
    );
  }
  if (typeof createCheckRun !== 'function') {
    throw new TypeError('Release candidate check publication requires a create-check-run port.');
  }

  const result = await createCheckRun({
    repository: command.repository,
    name: RELEASE_CANDIDATE_CHECK_NAME,
    headSha: command.headSha,
    status: 'in_progress',
    detailsUrl: command.detailsUrl,
    externalId: command.externalId,
    output: {
      title: 'Release candidate integrity is running',
      summary: 'Trusted base code is assessing the pull request head commit.',
    },
  });
  return requirePublicationIdentity(result, { headSha: command.headSha });
}

export async function completeReleaseCandidateIntegrityCheck(command, { completeCheckRun }) {
  requireRepository(command.repository);
  requireHeadSha(command.headSha);
  requireCheckRunId(command.checkRunId);
  if (!ALLOWED_CONCLUSIONS.has(command.conclusion)) {
    throw new TypeError('Release candidate check conclusion must be success or failure.');
  }
  if (typeof completeCheckRun !== 'function') {
    throw new TypeError('Release candidate check publication requires a complete-check-run port.');
  }

  const passed = command.conclusion === 'success';
  const result = await completeCheckRun({
    repository: command.repository,
    name: RELEASE_CANDIDATE_CHECK_NAME,
    headSha: command.headSha,
    checkRunId: command.checkRunId,
    status: 'completed',
    conclusion: command.conclusion,
    output: {
      title: passed ? 'Release candidate integrity passed' : 'Release candidate integrity failed',
      summary: passed
        ? 'Trusted assessment passed or was not applicable to this pull request.'
        : 'The trusted assessment failed. Inspect the linked workflow run.',
    },
  });
  return requirePublicationIdentity(result, {
    checkRunId: command.checkRunId,
    headSha: command.headSha,
  });
}
