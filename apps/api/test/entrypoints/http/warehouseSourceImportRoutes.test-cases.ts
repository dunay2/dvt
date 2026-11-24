/** Owned concern: verify protected warehouse connection and catalog HTTP scenarios. */

import { URLSearchParams } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { WarehouseSourcePublicationChangedError } from '../../../src/application/ports/warehouseSourceImport.js';
import { WorkspaceFileRevisionConflictError } from '../../../src/application/ports/workspaceFiles.js';
import { WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH } from '../../../src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.js';

import {
  expectWarehouseAuthorization,
  injectWarehouseRequest,
  SCOPE_QUERY,
  ROUTE_SCOPE,
  defaultOrdersSourceObject,
  buildApp,
  expectedWarehouseConnection,
} from './warehouseSourceImportRoutes.test-support.js';

describe('warehouseSourceImportRoutes', () => {
  it('validates current SQL through the protected governed PostgreSQL rail', async () => {
    const { app, validateSql } = buildApp();

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/warehouse/sql-validation`,
      payload: {
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: 'warehouse-prod',
        },
        sql: 'select * from public.orders',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'valid' });
    expect(validateSql).toHaveBeenCalledWith({
      credentialRef: 'postgres:warehouse',
      sql: ['SELECT *', 'FROM public.orders'].join('\n'),
    });
  });

  it('returns a bounded source data sample through the protected view query', async () => {
    const { app, authorize, probe } = buildApp();
    const previewRows = vi.spyOn(probe, 'previewSourceObjectRows');
    const objectId = encodeURIComponent('relation/analytics/erp/orders');
    const expectedPublicationToken = 'a'.repeat(64);

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/source-data-sample?${SCOPE_QUERY}&objectId=${objectId}&limit=1&expectedPublicationToken=${expectedPublicationToken}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      contractVersion: 1,
      connectionId: 'warehouse-prod',
      objectId: 'relation/analytics/erp/orders',
      columns: [
        { name: 'order_id', type: 'integer', nullable: false },
        { name: 'customer', type: 'text', nullable: true },
      ],
      rows: [{ values: ['1', 'Ada'] }],
      limit: 1,
      truncated: true,
      provenance: {
        mode: 'live',
        sourceRefs: [
          {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse-prod',
              provider: 'postgres',
            },
            sourceObjectId: 'relation/analytics/erp/orders',
          },
        ],
        queriedAt: '2026-08-17T10:00:00.000Z',
        limit: 1,
        navigation: 'bounded-first-page',
      },
    });
    expect(response.json()).not.toHaveProperty('credentialRef');
    expectWarehouseAuthorization(authorize, {
      kind: 'query',
      name: 'workspace:source-import:view',
    });
    expect(previewRows).toHaveBeenCalledWith(expect.objectContaining({ expectedPublicationToken }));
  });

  it('preserves a replaced publication as a conflict without returning its rows', async () => {
    const { app, authorize, probe } = buildApp();
    const previewRows = vi
      .spyOn(probe, 'previewSourceObjectRows')
      .mockRejectedValue(new WarehouseSourcePublicationChangedError());
    const expectedPublicationToken = 'a'.repeat(64);
    const query = new URLSearchParams({
      objectId: 'relation/analytics/erp/orders',
      limit: '20',
      expectedPublicationToken,
    });

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/source-data-sample?${SCOPE_QUERY}&${query}`,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'warehouse_source_publication_changed' },
    });
    expect(previewRows).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ expectedPublicationToken })
    );
    expectWarehouseAuthorization(authorize, {
      kind: 'query',
      name: 'workspace:source-import:view',
    });
  });

  it('rejects missing object identity and limits above the governed source sample bound', async () => {
    const { app } = buildApp();
    const missingObject = await injectWarehouseRequest(app, {
      method: 'GET',
      path: `/workspace/warehouse/connections/warehouse-prod/source-data-sample`,
    });
    const outOfRange = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/source-data-sample?${SCOPE_QUERY}&objectId=${encodeURIComponent('relation/analytics/erp/orders')}&limit=51`,
    });

    expect(missingObject.statusCode).toBe(400);
    expect(outOfRange.statusCode).toBe(400);
  });

  it('does not collapse an unknown governed connection into a generic sample failure', async () => {
    const { app } = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/missing/source-data-sample?${SCOPE_QUERY}&objectId=${encodeURIComponent('relation/analytics/erp/orders')}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
    });
  });

  it('renames a warehouse connection through a dedicated protected command rail', async () => {
    const { app, authorize } = buildApp();

    const response = await injectWarehouseRequest(app, {
      method: 'PATCH',
      path: `/workspace/warehouse/connections/warehouse-prod`,
      payload: { name: 'Finance warehouse' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expectedWarehouseConnection('Finance warehouse'));
    expectWarehouseAuthorization(authorize, {
      kind: 'command',
      name: 'workspace:source-connection:rename',
    });
  });

  it('returns explicit errors for invalid, duplicate, and unknown connection renames', async () => {
    const duplicate = buildApp({
      catalogEntries: [
        {
          id: 'warehouse-prod',
          name: 'Production warehouse',
          type: 'postgres',
          database: 'analytics',
          credentialRef: 'env:DVT_WAREHOUSE_URL',
          sourceObjects: [defaultOrdersSourceObject],
        },
        {
          id: 'finance-prod',
          name: 'Finance warehouse',
          type: 'postgres',
          database: 'finance',
          credentialRef: 'env:DVT_FINANCE_WAREHOUSE_URL',
          sourceObjects: [],
        },
      ],
    });

    const invalidResponse = await duplicate.app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/warehouse-prod?${SCOPE_QUERY}`,
      payload: { name: '   ' },
    });
    expect(invalidResponse.statusCode).toBe(400);

    const duplicateResponse = await duplicate.app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/warehouse-prod?${SCOPE_QUERY}`,
      payload: { name: ' FINANCE WAREHOUSE ' },
    });
    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toEqual({
      error: { type: 'conflict', reason: 'warehouse_connection_duplicate' },
    });

    const missingResponse = await duplicate.app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/missing?${SCOPE_QUERY}`,
      payload: { name: 'Missing connection' },
    });
    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toEqual({
      error: { type: 'not_found', reason: 'warehouse_connection_not_found' },
    });
  });

  it('fails the rename command closed without authentication or its dedicated grant', async () => {
    const unauthenticated = buildApp({ authenticated: false });
    const missingTokenResponse = await unauthenticated.app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/warehouse-prod?${SCOPE_QUERY}`,
      payload: { name: 'Finance warehouse' },
    });

    expect(missingTokenResponse.statusCode).toBe(401);
    expect(missingTokenResponse.json()).toEqual({
      error: { type: 'unauthorized', reason: 'missing_token' },
    });
    expect(unauthenticated.authorize).not.toHaveBeenCalled();

    const denied = buildApp({ authorized: false });
    const deniedResponse = await denied.app.inject({
      method: 'PATCH',
      url: `/workspace/warehouse/connections/warehouse-prod?${SCOPE_QUERY}`,
      payload: { name: 'Finance warehouse' },
    });

    expect(deniedResponse.statusCode).toBe(403);
    expect(deniedResponse.json()).toEqual({
      error: { type: 'forbidden', reason: 'action_not_granted' },
    });
    expect(denied.authorize).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: { kind: 'command', name: 'workspace:source-connection:rename' },
      }),
      expect.any(String)
    );
  });

  it('returns an explicit conflict when the rename loses its catalog revision race', async () => {
    const { app } = buildApp({
      renameError: new WorkspaceFileRevisionConflictError(
        WORKSPACE_WAREHOUSE_CONNECTION_CATALOG_PATH,
        'changed-revision'
      ),
    });

    const response = await injectWarehouseRequest(app, {
      method: 'PATCH',
      path: `/workspace/warehouse/connections/warehouse-prod`,
      payload: { name: 'Finance warehouse' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: { type: 'conflict', reason: 'workspace_file_revision_conflict' },
    });
  });

  it('creates a warehouse connection through the protected command rail before listing it', async () => {
    const { app, authorize, workspaceFiles } = buildApp({ catalogEntries: [] });

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/warehouse/connections`,
      payload: {
        name: 'Finance warehouse',
        type: 'postgres',
        database: 'finance',
        credentialRef: 'postgres:finance-warehouse',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: 'finance-warehouse',
      name: 'Finance warehouse',
      type: 'postgres',
      database: 'finance',
    });
    expectWarehouseAuthorization(authorize, {
      kind: 'command',
      name: 'workspace:source-connection:create',
    });
    expect(workspaceFiles.saveFileContent).toHaveBeenCalledWith(
      ROUTE_SCOPE,
      expect.objectContaining({
        path: '.dvt/warehouse-connections.json',
        content: expect.not.stringContaining('DVT_FINANCE_WAREHOUSE_URL='),
        expectedRevision: { kind: 'absent' },
      })
    );
  });

  it.each([
    {
      title: 'identifies an invalid PostgreSQL credential reference before command side effects',
      options: { catalogEntries: [] },
      payload: {
        name: 'Unsafe inline URL',
        type: 'postgres',
        database: 'finance',
        credentialRef: 'postgresql://user:password@localhost:5432/finance',
      },
      status: 400,
      responseBody: {
        error: {
          type: 'bad_request',
          reason: 'invalid_credential_reference',
          target: 'credentialRef',
        },
      },
    },
    {
      title: 'rejects duplicate warehouse connection names before mutating the catalog',
      options: undefined,
      payload: {
        name: 'Production warehouse',
        type: 'postgres',
        database: 'analytics',
        credentialRef: 'postgres:duplicate-warehouse',
      },
      status: 409,
      responseBody: {
        error: { type: 'conflict', reason: 'warehouse_connection_duplicate' },
      },
    },
    {
      title: 'rejects unsupported warehouse adapters without probing credentials',
      options: { catalogEntries: [] },
      payload: {
        name: 'MySQL legacy',
        type: 'mysql',
        database: 'legacy',
        credentialRef: 'postgres:mysql-warehouse',
      },
      status: 400,
      responseBody: {
        error: { type: 'bad_request', reason: 'unsupported_warehouse_adapter', target: 'type' },
      },
    },
  ])('$title', async ({ options, payload, status, responseBody }) => {
    const { app, workspaceFiles } = buildApp(options);
    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: '/workspace/warehouse/connections',
      payload,
    });
    expect(response.statusCode).toBe(status);
    expect(response.json()).toEqual(responseBody);
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
  });

  it('tests an existing warehouse connection through the protected command rail', async () => {
    const { app, authorize } = buildApp();

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/warehouse/connections/warehouse-prod/test`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      connectionId: 'warehouse-prod',
      status: 'passed',
      checkedAt: '2026-05-30T00:00:01.000Z',
      objectCount: 1,
    });
    expectWarehouseAuthorization(authorize, {
      kind: 'command',
      name: 'workspace:source-connection:test',
    });
  });

  it('returns a failed connection-test result for invalid credentials without exposing secrets', async () => {
    const { app } = buildApp({
      connectionTestResult: {
        status: 'failed',
        reason: 'invalid_credentials',
        message: 'The credential reference could not authenticate.',
      },
    });

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/warehouse/connections/warehouse-prod/test`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      connectionId: 'warehouse-prod',
      status: 'failed',
      reason: 'invalid_credentials',
      message: 'The credential reference could not authenticate.',
      checkedAt: '2026-05-30T00:00:01.000Z',
    });
    expect(response.body).not.toContain('env:');
  });

  it('rejects connection creation when credential testing fails', async () => {
    const { app, workspaceFiles } = buildApp({
      catalogEntries: [],
      connectionTestResult: {
        status: 'failed',
        reason: 'invalid_credentials',
        message: 'The credential reference could not authenticate.',
      },
    });

    const response = await injectWarehouseRequest(app, {
      method: 'POST',
      path: `/workspace/warehouse/connections`,
      payload: {
        name: 'Finance warehouse',
        type: 'postgres',
        database: 'finance',
        credentialRef: 'postgres:finance-warehouse',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: { type: 'unprocessable_entity', reason: 'warehouse_connection_test_failed' },
    });
    expect(workspaceFiles.saveFileContent).not.toHaveBeenCalled();
  });

  it('lists warehouse connections through the protected query rail', async () => {
    const { app, authorize } = buildApp();

    const response = await injectWarehouseRequest(app, {
      method: 'GET',
      path: `/workspace/warehouse/connections`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([expectedWarehouseConnection('Production warehouse')]);
    expectWarehouseAuthorization(authorize, {
      kind: 'query',
      name: 'workspace:source-import:view',
    });
  });

  it('does not return another workspace scope connection catalog', async () => {
    const { app } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/workspace/warehouse/connections?tenantId=tenant-a&projectId=project-a&environmentId=env-b',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('passes the canonical schema-list request to the source-object query rail', async () => {
    const { app, probe } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/objects?${SCOPE_QUERY}&kind=schema-list&limit=25&cursor=next-page`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      kind: 'schema-list',
      schemas: [{ catalog: 'analytics', schema: 'erp', objectCount: 1 }],
      truncated: false,
    });
    expect(probe.catalogRequests).toEqual([
      { kind: 'schema-list', limit: 25, cursor: 'next-page' },
    ]);
  });

  it('passes schema and global name-search projections without compatibility defaults', async () => {
    const { app, probe } = buildApp();

    const schemaResponse = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/objects?${SCOPE_QUERY}&kind=schema-page&catalog=analytics&schema=erp&limit=10`,
    });
    const searchResponse = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/objects?${SCOPE_QUERY}&kind=name-search&name=ord&limit=5&cursor=search-page`,
    });

    expect(schemaResponse.statusCode).toBe(200);
    expect(searchResponse.statusCode).toBe(200);
    expect(schemaResponse.json()).toEqual({
      kind: 'object-page',
      objects: [defaultOrdersSourceObject],
      truncated: false,
    });
    expect(searchResponse.json()).toEqual({
      kind: 'object-page',
      objects: [defaultOrdersSourceObject],
      truncated: false,
    });
    expect(probe.catalogRequests).toEqual([
      { kind: 'schema-page', catalog: 'analytics', schema: 'erp', limit: 10 },
      { kind: 'name-search', name: 'ord', limit: 5, cursor: 'search-page' },
    ]);
  });

  it.each([
    '',
    '&kind=unknown',
    '&kind=schema-page&catalog=analytics',
    '&kind=name-search&name=',
    '&kind=schema-list&schema=erp',
    '&kind=schema-list&limit=0',
    '&kind=schema-list&limit=101',
    '&kind=schema-list&limit=not-a-number',
  ])('rejects an invalid source-object catalog query%s', async (query) => {
    const { app, probe } = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: `/workspace/warehouse/connections/warehouse-prod/objects?${SCOPE_QUERY}${query}`,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { type: 'bad_request', reason: 'invalid_selection', target: 'query' },
    });
    expect(probe.catalogRequests).toEqual([]);
  });
});
