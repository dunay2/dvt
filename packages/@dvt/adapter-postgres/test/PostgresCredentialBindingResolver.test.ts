import { describe, expect, it } from 'vitest';

import {
  InvalidPostgresCredentialBindingsError,
  PostgresCredentialBindingResolver,
  parsePostgresCredentialBindings,
} from '../src/PostgresCredentialBindingResolver.js';

describe('PostgresCredentialBindingResolver', () => {
  it('resolves only explicit PostgreSQL aliases from the configured binding map', async () => {
    const resolver = new PostgresCredentialBindingResolver(
      JSON.stringify({
        'postgres:warehouse-a': 'postgresql://user:secret@warehouse-a/orders',
      })
    );

    await expect(resolver.resolveCredential('postgres:warehouse-a')).resolves.toBe(
      'postgresql://user:secret@warehouse-a/orders'
    );
    await expect(resolver.resolveCredential('postgres:missing')).resolves.toBeNull();
    await expect(resolver.resolveCredential('env:DATABASE_URL')).resolves.toBeNull();
  });

  it.each([
    ['invalid JSON', '{'],
    ['a dynamic environment alias', JSON.stringify({ 'env:DATABASE_URL': 'postgres://db/app' })],
    ['a non-PostgreSQL URL', JSON.stringify({ 'postgres:warehouse-a': 'mysql://db/app' })],
    ['an empty URL', JSON.stringify({ 'postgres:warehouse-a': '' })],
  ])('rejects %s at composition time', (_caseName, input) => {
    expect(() => parsePostgresCredentialBindings(input)).toThrow(
      InvalidPostgresCredentialBindingsError
    );
  });

  it('freezes the parsed credential map so runtime callers cannot mutate authority', () => {
    const parsed = parsePostgresCredentialBindings({
      'postgres:warehouse-a': 'postgres://db/orders',
    });

    expect(Object.isFrozen(parsed)).toBe(true);
  });
});
