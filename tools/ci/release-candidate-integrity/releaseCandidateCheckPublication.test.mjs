import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RELEASE_CANDIDATE_CHECK_NAME,
  beginReleaseCandidateIntegrityCheck,
  completeReleaseCandidateIntegrityCheck,
} from './releaseCandidateCheckPublication.mjs';

const headSha = 'a'.repeat(40);

test('begin publishes one canonical in-progress check on the authoritative head', async () => {
  const commands = [];
  const result = await beginReleaseCandidateIntegrityCheck(
    {
      repository: 'dunay2/dvt',
      headSha,
      detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/42',
      externalId: '42:1',
    },
    {
      createCheckRun: async (command) => {
        commands.push(command);
        return {
          id: 73,
          name: command.name,
          headSha: command.headSha,
          status: command.status,
        };
      },
    }
  );

  assert.equal(result.id, 73);
  assert.deepEqual(commands, [
    {
      repository: 'dunay2/dvt',
      name: RELEASE_CANDIDATE_CHECK_NAME,
      headSha,
      status: 'in_progress',
      detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/42',
      externalId: '42:1',
      output: {
        title: 'Release candidate integrity is running',
        summary: 'Trusted base code is assessing the pull request head commit.',
      },
    },
  ]);
});

test('begin rejects a check response attached to another commit', async () => {
  await assert.rejects(
    () =>
      beginReleaseCandidateIntegrityCheck(
        {
          repository: 'dunay2/dvt',
          headSha,
          detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/42',
          externalId: '42:1',
        },
        {
          createCheckRun: async () => ({
            id: 73,
            name: RELEASE_CANDIDATE_CHECK_NAME,
            headSha: 'b'.repeat(40),
            status: 'in_progress',
          }),
        }
      ),
    /authoritative pull request head/u
  );
});

test('complete publishes the assessment outcome only after verifying check identity', async () => {
  const commands = [];
  const result = await completeReleaseCandidateIntegrityCheck(
    {
      repository: 'dunay2/dvt',
      headSha,
      checkRunId: 73,
      conclusion: 'failure',
    },
    {
      completeCheckRun: async (command) => {
        commands.push(command);
        return {
          id: command.checkRunId,
          name: command.name,
          headSha: command.headSha,
          status: command.status,
          conclusion: command.conclusion,
        };
      },
    }
  );

  assert.equal(result.conclusion, 'failure');
  assert.deepEqual(commands, [
    {
      repository: 'dunay2/dvt',
      name: RELEASE_CANDIDATE_CHECK_NAME,
      headSha,
      checkRunId: 73,
      status: 'completed',
      conclusion: 'failure',
      output: {
        title: 'Release candidate integrity failed',
        summary: 'The trusted assessment failed. Inspect the linked workflow run.',
      },
    },
  ]);
});

test('publication commands fail closed on invalid identity or conclusion', async () => {
  await assert.rejects(
    () =>
      beginReleaseCandidateIntegrityCheck(
        {
          repository: 'dunay2/dvt',
          headSha: 'main',
          detailsUrl: 'https://github.com/dunay2/dvt/actions/runs/42',
          externalId: '42:1',
        },
        { createCheckRun: async () => undefined }
      ),
    /40-character commit SHA/u
  );
  await assert.rejects(
    () =>
      completeReleaseCandidateIntegrityCheck(
        {
          repository: 'dunay2/dvt',
          headSha,
          checkRunId: 73,
          conclusion: 'neutral',
        },
        { completeCheckRun: async () => undefined }
      ),
    /success or failure/u
  );
});
