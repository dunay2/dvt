/**
 * @file apps/api/test/integration/protectedRuntime.integration.shared.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0004: Event Sourcing Strategy
 * @decision Provide one shared source for protected runtime integration constants and routing guards
 * @date 2026-04-18
 */
import process from 'node:process';

import { describe } from 'vitest';

export const DATABASE_URL = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
export const TEMPORAL_ADDRESS = process.env['TEMPORAL_ADDRESS'];
export const describeIfPg = DATABASE_URL && TEMPORAL_ADDRESS ? describe : describe.skip;
export const TENANT_ID = 'tenant-api-it';
export const PROJECT_ID = 'project-api-it';
export const ENVIRONMENT_ID = 'env-api-it';
export const PRINCIPAL_ID = 'principal-api-it';
export const TENANT_ACTIONS_FULL = [
  'run:start',
  'run:list',
  'run:view',
  'run:logs:view',
  'run:signal',
  'run:cancel',
  'run:retry',
  'workspace:graph-draft:view',
  'workspace:graph-draft:save',
] as const;
export const TENANT_ACTIONS_WITH_ADMIN_REBUILD = [
  ...TENANT_ACTIONS_FULL,
  'admin:rebuild-snapshot',
] as const;
export const PROTECTED_RUNTIME_ISSUER = 'https://issuer.integration.example/';
export const PROTECTED_RUNTIME_AUDIENCE = 'dvt-api';
