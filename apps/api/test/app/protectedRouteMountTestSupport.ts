import { expect } from 'vitest';

import { HTTP_STATUS } from '../../src/routes/healthContract.js';

import type { BuiltApp } from './appEnvTestSupport.js';
import { buildCompilePayload, buildPreviewPayload, buildStartRunPayload, httpError } from './appRoutePayloads.js';
import { withProtectedRuntimeApp } from './protectedRuntimeAppTestSupport.js';

export async function injectProtectedRouteMountChecks(
  app: BuiltApp['app'],
  args: {
    readonly runId: string;
    readonly planId: string;
    readonly sha256: string;
  }
): Promise<void> {
  const adminResponse = await app.inject({
    method: 'POST',
    url: `/admin/runs/${args.runId}/rebuild-snapshot`,
    payload: {
      tenantId: 'tenant-a',
    },
  });
  const protectedResponse = await app.inject({
    method: 'POST',
    url: '/runs/start',
    payload: buildStartRunPayload({ planId: args.planId, sha256: args.sha256 }),
  });
  const previewResponse = await app.inject({
    method: 'POST',
    url: '/plans/preview',
    payload: buildPreviewPayload(args.runId),
  });
  const compileResponse = await app.inject({
    method: 'POST',
    url: '/plans/compile',
    payload: buildCompilePayload(),
  });

  expect(adminResponse.statusCode).toBe(404);
  expect(protectedResponse.statusCode).toBe(404);
  expect(previewResponse.statusCode).toBe(404);
  expect(compileResponse.statusCode).toBe(404);
}

export async function expectProtectedRouteRequiresBearer(args: {
  readonly url: string;
  readonly payload: Record<string, unknown>;
}): Promise<void> {
  await withProtectedRuntimeApp(async ({ app }) => {
    const response = await app.inject({
      method: 'POST',
      url: args.url,
      payload: args.payload,
    });

    expect(response.statusCode).toBe(HTTP_STATUS.unauthorized);
    expect(response.json()).toEqual(httpError('unauthorized', 'missing_token'));
  });
}
