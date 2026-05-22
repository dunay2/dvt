/**
 * Owned concern: read workspace diff-change artifacts from the configured local
 * protected-runtime workspace root.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  InvalidWorkspaceDiffChangesError,
  type IWorkspaceDiffChangesRepository,
  type WorkspaceDiffChange,
} from '../../application/ports/workspaceDiffChanges.js';

const DEFAULT_DIFF_CHANGES_PATH = path.join('target', 'diff_changes.json');
const CHANGE_TYPES = new Set(['added', 'removed', 'changed']);
const SEVERITIES = new Set(['breaking', 'warning', 'info']);

export class LocalWorkspaceDiffChangesRepository implements IWorkspaceDiffChangesRepository {
  public constructor(
    private readonly options: {
      readonly root: string;
      readonly relativePath?: string;
    }
  ) {}

  public async listDiffChanges(): Promise<readonly WorkspaceDiffChange[]> {
    const artifactPath = this.resolveArtifactPath();
    let raw: string;

    try {
      raw = await readFile(artifactPath, 'utf8');
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return [];
      }

      throw error;
    }

    return parseWorkspaceDiffChanges(raw, artifactPath);
  }

  private resolveArtifactPath(): string {
    return path.resolve(this.options.root, this.options.relativePath ?? DEFAULT_DIFF_CHANGES_PATH);
  }
}

function parseWorkspaceDiffChanges(
  raw: string,
  artifactPath: string
): readonly WorkspaceDiffChange[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidWorkspaceDiffChangesError(artifactPath);
  }

  if (!Array.isArray(parsed)) {
    throw new InvalidWorkspaceDiffChangesError(artifactPath);
  }

  return parsed.map((value) => parseWorkspaceDiffChange(value, artifactPath));
}

function parseWorkspaceDiffChange(value: unknown, artifactPath: string): WorkspaceDiffChange {
  if (!value || typeof value !== 'object') {
    throw new InvalidWorkspaceDiffChangesError(artifactPath);
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.nodeId !== 'string' ||
    typeof record.type !== 'string' ||
    !CHANGE_TYPES.has(record.type) ||
    typeof record.severity !== 'string' ||
    !SEVERITIES.has(record.severity) ||
    typeof record.description !== 'string'
  ) {
    throw new InvalidWorkspaceDiffChangesError(artifactPath);
  }

  return {
    id: record.id,
    nodeId: record.nodeId,
    type: record.type as WorkspaceDiffChange['type'],
    severity: record.severity as WorkspaceDiffChange['severity'],
    description: record.description,
    ...(Object.hasOwn(record, 'oldValue') ? { oldValue: record.oldValue } : {}),
    ...(Object.hasOwn(record, 'newValue') ? { newValue: record.newValue } : {}),
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
