import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { OtelObservability } from '@dvt/observability-otel';
import { describe, expect, it, vi } from 'vitest';

import { HTTP_STATUS } from '../src/routes/healthContract.js';

import { BASE_APP_ENV, withAppEnv } from './app/appEnvTestSupport.js';

function readApiDeployFile(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function expectNoNpmCommand(text: string): void {
  expect(text).not.toMatch(/(^|[^\w-])npm\s+(run|ci|i)\b/);
}

describe('dvt-api deployment command posture', () => {
  it('keeps deploy entrypoints on monorepo pnpm commands', () => {
    const procfile = readApiDeployFile('../Procfile');
    const rootNixpacks = readApiDeployFile('../../../nixpacks.toml');
    const apiNixpacks = readApiDeployFile('../nixpacks.toml');
    const dockerfile = readApiDeployFile('../Dockerfile');

    expect(procfile).toContain('pnpm');
    expect(procfile).toContain('--filter dvt-api start');
    expectNoNpmCommand(procfile);

    for (const nixpacks of [rootNixpacks, apiNixpacks]) {
      expect(nixpacks).toContain('pnpm install --frozen-lockfile --filter dvt-api...');
      expect(nixpacks).toContain('pnpm --filter dvt-api build');
      expect(nixpacks).toContain('pnpm --filter dvt-api start');
      expectNoNpmCommand(nixpacks);
    }

    expect(dockerfile).toContain('corepack enable');
    expect(dockerfile).toContain('tsconfig*.json');
    expect(dockerfile).toContain('pnpm install --frozen-lockfile --filter dvt-api...');
    expect(dockerfile).toContain('pnpm --filter dvt-api build');
    expect(dockerfile).toContain('CMD ["pnpm", "--filter", "dvt-api", "start"]');
    expectNoNpmCommand(dockerfile);
  });
});

describe('buildApp composition root smoke', () => {
  it('wires observability and exposes health endpoint', async () => {
    await withAppEnv(BASE_APP_ENV, async ({ app, ctx }) => {
      expect(ctx.observability).toBeTruthy();

      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
      });

      expect(res.statusCode).toBe(HTTP_STATUS.ok);
      expect(res.json()).toEqual({
        ok: true,
        status: 'healthy',
        components: {
          intentReconciler: {
            status: 'disabled',
          },
        },
      });
    });
  });

  it('allows browser preflight for workspace graph draft writes', async () => {
    await withAppEnv(BASE_APP_ENV, async ({ app }) => {
      const res = await app.inject({
        method: 'OPTIONS',
        url: '/workspace/graph/draft',
        headers: {
          origin: 'http://localhost:4174',
          'access-control-request-method': 'PUT',
          'access-control-request-headers': 'authorization,content-type,x-tenant-id,x-project-id',
        },
      });

      expect(res.statusCode).toBe(204);
      expect(res.headers['access-control-allow-methods']).toContain('PUT');
      expect(res.headers['access-control-allow-headers']).toContain('authorization');
      expect(res.headers['access-control-allow-headers']).toContain('content-type');
      expect(res.headers['access-control-allow-headers']).toContain('x-tenant-id');
      expect(res.headers['access-control-allow-headers']).toContain('x-project-id');
    });
  });

  it('shuts down the managed trace exporter when the application closes', async () => {
    const shutdownSpy = vi.spyOn(OtelObservability.prototype, 'shutdown');
    let observability: OtelObservability | undefined;

    await withAppEnv({ ...BASE_APP_ENV, OBS_ENABLED: 'true' }, async ({ ctx }) => {
      observability = ctx.observability as OtelObservability;
    });

    const shutdownCallsAtClose = shutdownSpy.mock.calls.length;
    if (shutdownCallsAtClose === 0) {
      await observability?.shutdown();
    }
    shutdownSpy.mockRestore();

    expect(shutdownCallsAtClose).toBe(1);
  });
});
