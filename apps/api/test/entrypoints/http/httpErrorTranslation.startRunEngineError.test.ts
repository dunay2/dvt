import { describe, it } from 'vitest';

import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
} from '../../../src/application/ports/startRunEngineError.js';
import { httpErrorTranslation } from '../../../src/entrypoints/http/httpErrorTranslation.js';

import { expectCanonicalErrorResponse } from './httpErrorTranslation.test.support.js';

describe('httpErrorTranslation start-run engine errors', () => {
  it.each([
    {
      description: 'adapter_not_registered -> 422',
      input: {
        kind: 'adapter_not_registered' as const,
        adapter: 'temporal',
      },
      expected: {
        status: 422,
        type: 'unprocessable',
        reason: 'adapter_not_configured',
        details: { adapter: 'temporal' },
      },
    },
    {
      description: 'command_invalid -> 422 plan_rejected',
      input: {
        kind: 'command_invalid' as const,
        code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
        reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
      },
      expected: {
        status: 422,
        type: 'unprocessable',
        reason: 'plan_rejected',
        details: {
          message: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
          cause: 'plan_ref_required',
        },
      },
    },
    {
      description: 'unsupported_plan_version -> 422 plan_rejected',
      input: {
        kind: 'unsupported_plan_version' as const,
        planVersion: '2.7',
        supportedVersions: ['1.0'],
      },
      expected: {
        status: 422,
        type: 'unprocessable',
        reason: 'unsupported_plan_version',
        details: {
          message: 'Unsupported plan version: 2.7',
          supportedVersions: ['1.0'],
        },
      },
    },
  ])('$description', ({ input, expected }) => {
    expectCanonicalErrorResponse(httpErrorTranslation.startRun.engineError(input), expected);
  });
});
