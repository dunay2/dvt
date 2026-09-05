/** Owned concern: safely delegate approved read-only governance queries to the existing Planning DB CLI. */
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const toolDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(toolDir, '../..');
const planningDbQueryScript = path.join(repoRoot, 'scripts', 'planning-db-query.cjs');

export const ALLOWED_PLANNING_DB_QUERIES = Object.freeze([
  'architecture-designs',
  'component-profile',
  'architecture-responsibilities',
  'frontend-component-rails',
  'component-integrity',
  'canvas-cq-rail-drift',
  'canvas-component-registry-drift',
]);

const allowedQueries = new Set(ALLOWED_PLANNING_DB_QUERIES);
const componentIdPattern = /^[A-Za-z0-9._:-]{1,128}$/u;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const QUERY_TIMEOUT_MS = 30_000;

function requireQuery(value) {
  if (typeof value !== 'string' || !allowedQueries.has(value)) {
    throw new Error('Unsupported Planning DB query.');
  }
  return value;
}

function resolveLimit(value) {
  if (value === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(value) || value < 1 || value > MAX_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_LIMIT}.`);
  }
  return value;
}

function resolveComponent(query, value) {
  if (query === 'component-profile') {
    if (typeof value !== 'string' || !componentIdPattern.test(value)) {
      throw new Error('component-profile requires a valid component id.');
    }
    return value;
  }
  if (value !== undefined) {
    throw new Error(`component is not supported for ${query}.`);
  }
  return undefined;
}

export function buildPlanningDbQueryInvocation(input) {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Planning DB query input must be an object.');
  }
  const query = requireQuery(input.query);
  const limit = resolveLimit(input.limit);
  const component = resolveComponent(query, input.component);
  const args = [planningDbQueryScript, query, '--limit', String(limit), '--no-refresh'];
  if (component !== undefined) args.push('--component', component);
  return Object.freeze({ executable: process.execPath, args: Object.freeze(args), cwd: repoRoot });
}

function sanitizeFailure(error) {
  const stderr = typeof error?.stderr === 'string' ? error.stderr : '';
  const message =
    stderr.trim() || (error instanceof Error ? error.message : 'Planning DB query failed.');
  return message
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/giu, 'postgresql://***@')
    .slice(0, 2000);
}

export async function runPlanningDbQuery(input) {
  const invocation = buildPlanningDbQueryInvocation(input);
  try {
    const { stdout } = await execFileAsync(invocation.executable, invocation.args, {
      cwd: invocation.cwd,
      env: process.env,
      windowsHide: true,
      timeout: QUERY_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      encoding: 'utf8',
    });
    return stdout.trimEnd();
  } catch (error) {
    throw new Error(`Planning DB query failed: ${sanitizeFailure(error)}`, { cause: error });
  }
}
