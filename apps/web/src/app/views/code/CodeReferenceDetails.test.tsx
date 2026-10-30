/** Prove that the existing file rail cannot show a stale or unauthorized definition. */
import { sha256HexUtf8 } from '@dvt/crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { withTestQueryClient } from '../../../testing/reactQueryHarness';

import { CodeReferenceDetails } from './CodeReferenceDetails';
import { resolveCodeInlineReferenceCopy } from './codeViewCopy';
import type { CodeInlineReferenceDetail } from './codeInlineReferences';

const queryState = vi.hoisted(() => ({
  data: undefined as undefined | { path: string; content: string; contentSha256: string },
  isSuccess: false,
  isPending: false,
  isFetching: false,
}));
vi.mock('../../queries/workspaceQueries', () => ({
  useWorkspaceFileContentQuery: () => queryState,
}));

const sql = 'select client_id from raw.client';
const reference: CodeInlineReferenceDetail = {
  id: 'reference-region',
  uniqueId: 'model.private_identity.clients',
  name: 'Clients',
  kind: 'model',
  inputs: ['Clients source'],
  columns: [{ name: 'client_id', dataType: 'text' }],
  definition: { path: 'project/models/clients.sql', revisionSha256: sha256HexUtf8(sql) },
};
let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | undefined;
async function mount(): Promise<HTMLDivElement> {
  mounted = await withTestQueryClient(
    <CodeReferenceDetails
      reference={reference}
      copy={resolveCodeInlineReferenceCopy('en')}
      onClose={() => undefined}
    />
  );
  return mounted.container;
}
afterEach(async () => {
  await mounted?.cleanup();
  mounted = undefined;
  Object.assign(queryState, {
    data: undefined,
    isSuccess: false,
    isPending: false,
    isFetching: false,
  });
});

describe('real reference definition presentation', () => {
  it('shows verified definition bytes and declared columns without internal identities', async () => {
    Object.assign(queryState, {
      isSuccess: true,
      data: { path: reference.definition?.path, content: sql, contentSha256: sha256HexUtf8(sql) },
    });
    const host = await mount();
    expect(host.querySelector('pre')?.textContent).toBe(sql);
    expect(host.textContent).toContain('client_id');
    expect(host.textContent).toContain('Declared columns');
    expect(host.textContent).not.toContain(reference.uniqueId);
  });

  it.each(['changed-bytes', 'different-path', 'revoked-query'])(
    'keeps %s out of the readonly definition',
    async (failure) => {
      Object.assign(queryState, {
        isSuccess: true,
        data: { path: reference.definition?.path, content: sql, contentSha256: sha256HexUtf8(sql) },
      });
      if (failure === 'changed-bytes' && queryState.data)
        queryState.data.content = 'select changed_content';
      if (failure === 'different-path' && queryState.data)
        queryState.data.path = 'other/models/clients.sql';
      if (failure === 'revoked-query') queryState.isSuccess = false;
      const host = await mount();
      expect(host.querySelector('pre')).toBeNull();
      expect(host.textContent).toContain('A verified definition is not available.');
      expect(host.textContent).toContain('client_id');
    }
  );
});
