// @vitest-environment jsdom

import { DbtSelectedModelAnalysisSchema } from '@dvt/contracts';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApiDbtSelectedModelAnalysisQueryPort } from './dbtSelectedModelAnalysis.api';
import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';
import { ApiError } from '../api/createApiClient';
import { createApiClientHarness, jsonResponse } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  clearGrantedWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';

installWorkspaceScopeHarness();

const binding: DbtProjectFilesAuthorityBinding = {
  schemaVersion: 'canvas-authoring-authority-binding.v1',
  canvasId: 'analytics-canvas',
  authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
};
const selectedUniqueId = 'model.analytics.orders';

function buildAnalysis(): ReturnType<typeof DbtSelectedModelAnalysisSchema.parse> {
  return DbtSelectedModelAnalysisSchema.parse({
    schemaVersion: 'dbt-selected-model-analysis.v1',
    status: 'ready',
    authorityBinding: binding,
    projectRevision: {
      projectRoot: 'analytics',
      contentSetSha256: '1'.repeat(64),
      analyzedAt: '2026-10-29T10:00:00.000Z',
      analyzerVersion: 'dvt-dbt-analyzer.v2',
    },
    analysisSha256: '2'.repeat(64),
    selectedAnalysisSha256: '3'.repeat(64),
    capabilitySet: {
      analyzerVersion: 'dvt-dbt-analyzer.v2',
      supportedRegionKinds: ['ref', 'source'],
      capabilitySetSha256: '4'.repeat(64),
    },
    selectedUniqueId,
    files: [],
    identities: [
      {
        uniqueId: selectedUniqueId,
        resourceType: 'model',
        name: 'orders',
        packageName: 'analytics',
        relationToSelection: 'selected',
      },
    ],
    dependencies: [],
    regions: [],
    diagnostics: [],
  });
}

describe('selected dbt model analysis API port', () => {
  beforeEach(() => setWorkspaceScope(buildWorkspaceScope()));

  it('queries the existing rail using the granted workspace and accepted Canvas identity', async () => {
    const analysis = buildAnalysis();
    const { apiClient, requestRaw, postJson } = createApiClientHarness({
      requestRaw: async () => jsonResponse(analysis),
    });

    await expect(
      createApiDbtSelectedModelAnalysisQueryPort(apiClient).analyzeSelectedModel(
        binding,
        selectedUniqueId
      )
    ).resolves.toEqual(analysis);
    expect(requestRaw).toHaveBeenCalledExactlyOnceWith(
      '/workspace/dbt/analysis/selected-model?tenantId=tenant-a&projectId=project-a&environmentId=env-a&canvasId=analytics-canvas&selectedUniqueId=model.analytics.orders&projectRoot=analytics',
      { method: 'GET' }
    );
    expect(postJson).not.toHaveBeenCalled();
  });

  it.each(['canvas', 'project root', 'selected model'])(
    'rejects a response for a different %s',
    async (field) => {
      const analysis = buildAnalysis();
      if (field === 'canvas') analysis.authorityBinding.canvasId = 'another-canvas';
      if (field === 'project root') {
        analysis.authorityBinding.authority = { kind: 'dbt-project-files', projectRoot: 'other' };
        analysis.projectRevision.projectRoot = 'other';
      }
      if (field === 'selected model') {
        analysis.selectedUniqueId = 'model.analytics.other';
        analysis.identities[0]!.uniqueId = analysis.selectedUniqueId;
      }
      const { apiClient } = createApiClientHarness({
        requestRaw: async () => jsonResponse(analysis),
      });

      await expect(
        createApiDbtSelectedModelAnalysisQueryPort(apiClient).analyzeSelectedModel(
          binding,
          selectedUniqueId
        )
      ).rejects.toThrow('different authority or model');
    }
  );

  it('rejects malformed success data instead of inventing analysis', async () => {
    const { apiClient } = createApiClientHarness({
      requestRaw: async () => jsonResponse({ status: 'ready' }),
    });
    await expect(
      createApiDbtSelectedModelAnalysisQueryPort(apiClient).analyzeSelectedModel(
        binding,
        selectedUniqueId
      )
    ).rejects.toThrow();
  });

  it('preserves a protected HTTP failure as ApiError with its response body', async () => {
    const body = { error: { type: 'forbidden', reason: 'workspace_scope_denied' } };
    const { apiClient } = createApiClientHarness({
      requestRaw: async () => jsonResponse(body, 403),
    });
    const pending = createApiDbtSelectedModelAnalysisQueryPort(apiClient).analyzeSelectedModel(
      binding,
      selectedUniqueId
    );
    await expect(pending).rejects.toBeInstanceOf(ApiError);
    await expect(pending).rejects.toMatchObject({
      statusCode: 403,
      category: 'client',
      responseBody: body,
    });
  });

  it('does not hide an unreadable server error body behind a decoding success', async () => {
    const { apiClient } = createApiClientHarness({
      requestRaw: async () => new Response('Unavailable', { status: 503 }),
    });
    await expect(
      createApiDbtSelectedModelAnalysisQueryPort(apiClient).analyzeSelectedModel(
        binding,
        selectedUniqueId
      )
    ).rejects.toMatchObject({ statusCode: 503, category: 'server', responseBody: null });
  });

  it('does not request analysis without granted scope or a nonblank model identity', async () => {
    const { apiClient, requestRaw } = createApiClientHarness();
    const port = createApiDbtSelectedModelAnalysisQueryPort(apiClient);
    await expect(port.analyzeSelectedModel(binding, ' ')).rejects.toThrow();
    clearGrantedWorkspaceScope();
    await expect(port.analyzeSelectedModel(binding, selectedUniqueId)).rejects.toThrow();
    expect(requestRaw).not.toHaveBeenCalled();
  });
});
