// @vitest-environment jsdom
/** Prove SQL remains in POST bodies and every response belongs to the current scoped buffer. */
import { describe, expect, it, vi } from 'vitest';
import { ModelSqlCompilationRequestSchema } from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';
import { createApiClientHarness } from '../workspace/workspaceApiClient.test.harness';
import {
  buildWorkspaceScope,
  installWorkspaceScopeHarness,
  setWorkspaceScope,
} from '../workspace/workspaceScope.test.harness';
import { createApiCanvasModelSqlQueryPort } from './canvasModelSql.api';

installWorkspaceScopeHarness();
const target = { canvasId: 'canvas/one', transformNodeId: 'model/one' };
const input = ModelSqlCompilationRequestSchema.parse({
  ...target,
  draftRevision: 'r1',
  contextSha256: 'a'.repeat(64),
  sql: 'SELECT country FROM client',
});
const invalid = {
  schemaVersion: 'canvas-model-sql-compilation.v1',
  ...target,
  draftRevision: input.draftRevision,
  contextSha256: input.contextSha256,
  sqlSha256: sha256HexUtf8(input.sql),
  status: 'invalid',
  diagnostics: [{ code: 'unknown_input', source: 'binding', message: 'Input is unavailable.' }],
};
describe('Model SQL transport', () => {
  it('uses protected scope and the exact SQL body without putting SQL in a URL', async () => {
    setWorkspaceScope(buildWorkspaceScope());
    const { apiClient, postJson } = createApiClientHarness({
      postJson: async <T, R>(_endpoint: string, _input: T) => invalid as R,
    });
    const port = createApiCanvasModelSqlQueryPort(apiClient, { record: vi.fn() });
    expect(await port.compile(input)).toEqual(invalid);
    expect(postJson.mock.calls[0]?.[0]).toContain(
      '/canvas%2Fone/transforms/model%2Fone/sql-compilation?tenantId=tenant-a'
    );
    expect(postJson.mock.calls[0]?.[0]).not.toContain('SELECT');
    expect(postJson.mock.calls[0]?.[1]).toEqual(input);
  });
  it.each(['draftRevision', 'contextSha256', 'sqlSha256', 'transformNodeId'])(
    'rejects a response with another %s',
    async (key) => {
      setWorkspaceScope(buildWorkspaceScope());
      const response = { ...invalid, [key]: key.endsWith('Sha256') ? 'b'.repeat(64) : 'other' };
      const { apiClient } = createApiClientHarness({
        postJson: async <T, R>(_endpoint: string, _input: T) => response as R,
      });
      const record = vi.fn();
      await expect(
        createApiCanvasModelSqlQueryPort(apiClient, { record }).compile(input)
      ).rejects.toMatchObject({ reason: 'contract' });
      expect(record).toHaveBeenCalledWith({
        type: 'frontend.contract.failed',
        operation: 'CompileCanvasModelSql',
        reasonCode: 'response-contract-rejected',
      });
    }
  );
  it('forwards cancellation rather than concealing it as success', async () => {
    setWorkspaceScope(buildWorkspaceScope());
    const { apiClient, getJson } = createApiClientHarness({
      getJson: async () => {
        throw new DOMException('aborted', 'AbortError');
      },
    });
    const controller = new AbortController();
    await expect(
      createApiCanvasModelSqlQueryPort(apiClient, { record: vi.fn() }).context(
        target,
        controller.signal
      )
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(getJson.mock.calls[0]?.[1]).toMatchObject({ signal: controller.signal });
  });
});
