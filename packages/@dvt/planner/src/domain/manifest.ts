/**
 * Design (SOLID + DDD + CQRS):
 *
 *  CQRS segregation:
 *   - COMMAND side → DeriveNodesCommand (input VO) + ManifestGraphDeriver.execute()
 *   - QUERY side   → readonly GraphNode[] (read model)
 *
 *  Sub-responsibilities (SRP):
 *   - ManifestValidator   → asserts structural invariants on the raw manifest
 *   - ManifestNodeParser  → parses a single manifest node entry into a GraphNode
 *   - ManifestGraphDeriver → Domain Service coordinating the above
 */
import { PlannerError, PlannerErrorCode } from './errors.js';
import type { GraphNode } from './types.js';

// ── Internal types ─────────────────────────────────────────────────────────────

type ManifestNodeLike = {
  resource_type?: unknown;
  depends_on?: { nodes?: unknown };
  config?: unknown;
};

type ManifestLike = {
  nodes?: Record<string, ManifestNodeLike>;
};

// ── COMMAND ────────────────────────────────────────────────────────────────────
// Immutable value object expressing the intent to derive nodes from a manifest.

export class DeriveNodesCommand {
  constructor(readonly manifest: Record<string, unknown>) {}
}

// ── ManifestValidator ──────────────────────────────────────────────────────────
// SRP: only knows how to assert structural invariants on the raw manifest.

class ManifestValidator {
  assertNodes(manifest: ManifestLike): Record<string, ManifestNodeLike> {
    const { nodes } = manifest;
    if (nodes === undefined || typeof nodes !== 'object' || nodes === null) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'manifest.nodes must be a non-null object when manifest is provided.'
      );
    }
    return nodes;
  }

  assertNonEmpty(nodes: readonly GraphNode[]): void {
    if (nodes.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'manifest.nodes does not contain supported dbt resources (model/test/snapshot).'
      );
    }
  }
}

// ── ManifestNodeParser ─────────────────────────────────────────────────────────
// SRP: parses a single manifest entry into a GraphNode.
// Returns undefined for entries with unsupported/missing resource types.

const SUPPORTED_RESOURCE_TYPES = new Set(['model', 'test', 'snapshot']);

class ManifestNodeParser {
  parse(nodeId: string, raw: ManifestNodeLike): GraphNode | undefined {
    const { resource_type: resourceType } = raw;
    if (typeof resourceType !== 'string' || !SUPPORTED_RESOURCE_TYPES.has(resourceType)) {
      return undefined;
    }
    return {
      nodeId,
      stepKind:
        resourceType === 'model'
          ? 'DBT_MODEL'
          : resourceType === 'test'
            ? 'DBT_TEST'
            : 'DBT_SNAPSHOT',
      dependsOn: this.parseDependsOn(raw),
    };
  }

  private parseDependsOn(raw: ManifestNodeLike): string[] {
    const nodes = raw.depends_on?.nodes;
    return Array.isArray(nodes) && nodes.every((v): v is string => typeof v === 'string')
      ? [...nodes]
      : [];
  }
}

// ── ManifestGraphDeriver (Domain Service / Command Handler) ───────────────────
// Handles DeriveNodesCommand; returns an immutable GraphNode read model.
// No persistence, no side effects, deterministic.

export class ManifestGraphDeriver {
  private readonly validator = new ManifestValidator();
  private readonly parser = new ManifestNodeParser();

  execute(command: DeriveNodesCommand): readonly GraphNode[] {
    const root = command.manifest as ManifestLike;
    const rawNodes = this.validator.assertNodes(root);
    const sortedNodeIds = Object.keys(rawNodes).sort((left, right) => left.localeCompare(right));

    const result: GraphNode[] = [];
    for (const nodeId of sortedNodeIds) {
      const raw = rawNodes[nodeId];
      if (raw === null || typeof raw !== 'object') continue;
      const node = this.parser.parse(nodeId, raw);
      if (node !== undefined) result.push(node);
    }

    this.validator.assertNonEmpty(result);
    return result;
  }
}
