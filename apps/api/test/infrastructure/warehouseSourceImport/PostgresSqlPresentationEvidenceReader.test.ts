/** Provider failures cannot leak credentials, keep connections open or certify scalar resolution. */
import { describe, expect, it, vi } from 'vitest';

import { PostgresSqlPresentationEvidenceReader } from '../../../src/infrastructure/warehouseSourceImport/PostgresSqlPresentationEvidenceReader.js';

const input = {
  credentialRef: 'governed',
  database: 'warehouse',
  relations: [{ schema: 'raw', table: 'client' }],
};
function harness(): Readonly<{
  reader: PostgresSqlPresentationEvidenceReader;
  client: {
    query: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  };
  resolveCredential: ReturnType<typeof vi.fn>;
  clientFactory: ReturnType<typeof vi.fn>;
}> {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const client = {
    query,
    connect: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
  };
  const resolveCredential = vi.fn().mockResolvedValue('postgresql://private');
  const clientFactory = vi.fn().mockReturnValue(client);
  const reader = new PostgresSqlPresentationEvidenceReader({
    credentialResolver: { resolveCredential },
    clientFactory,
  });
  return { reader, client, resolveCredential, clientFactory };
}

describe('PostgreSQL presentation evidence connection boundary', () => {
  it('rejects a foreign catalog before credential IO', async () => {
    const h = harness();
    expect(
      await h.reader.read({
        ...input,
        relations: [{ schema: 'raw', table: 'client', catalog: 'another' }],
      })
    ).toBeNull();
    expect(h.resolveCredential).not.toHaveBeenCalled();
    expect(h.clientFactory).not.toHaveBeenCalled();
  });
  it('does not open an unresolved credential', async () => {
    const h = harness();
    h.resolveCredential.mockResolvedValue(null);
    expect(await h.reader.read(input)).toBeNull();
    expect(h.clientFactory).not.toHaveBeenCalled();
  });

  it('closes a failed connection without querying a warehouse', async () => {
    const h = harness();
    h.client.connect.mockRejectedValue(new Error('Private connection failure'));
    expect(await h.reader.read(input)).toBeNull();
    expect(h.client.query).not.toHaveBeenCalled();
    expect(h.client.end).toHaveBeenCalledOnce();
    expect(h.clientFactory).toHaveBeenCalledWith(
      expect.objectContaining({ connectionTimeoutMillis: 3000, query_timeout: 3000 })
    );
  });

  it('rolls back a warehouse identity mismatch and closes its client', async () => {
    const h = harness();
    h.client.query.mockResolvedValue({ rows: [{ database: 'another-warehouse' }] });
    expect(await h.reader.read(input)).toBeNull();
    expect(h.client.query).toHaveBeenCalledWith(
      'begin transaction isolation level repeatable read read only'
    );
    expect(h.client.query).toHaveBeenLastCalledWith('rollback');
    expect(h.client.end).toHaveBeenCalledOnce();
  });
});
