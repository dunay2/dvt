import type { DesignGraphDraft, GitArtifactRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

import {
  requireSinkPayload,
  requireSourcePayload,
  requireTransformPayload,
  resolveNodeRole,
} from './previewGraphNodePayloads';

export type PreviewArtifactContext = {
  tenantId: string;
  projectId: string;
  environmentId: string;
};

export function buildPreviewDesignGraphArtifactContent(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  sqlArtifact: GitArtifactRef;
  context: PreviewArtifactContext;
}): string {
  return serializePreviewDesignGraphArtifact(
    buildPreviewDesignGraphDraft({
      nodes: args.nodes,
      edges: args.edges,
      scopedNodeIds: args.scopedNodeIds,
      sqlArtifact: args.sqlArtifact,
      context: args.context,
    })
  );
}

export function serializePreviewDesignGraphArtifact(designGraphDraft: DesignGraphDraft): string {
  const lines = [
    'context:',
    `  tenantId: ${quoteYamlScalar(designGraphDraft.context.tenantId)}`,
    `  projectId: ${quoteYamlScalar(designGraphDraft.context.projectId)}`,
    `  environmentId: ${quoteYamlScalar(designGraphDraft.context.environmentId)}`,
    `  executionTarget: ${quoteYamlScalar(designGraphDraft.context.executionTarget)}`,
    'nodes:',
  ];

  for (const node of designGraphDraft.nodes) {
    lines.push(`  - id: ${quoteYamlScalar(node.id)}`);
    lines.push(`    type: ${quoteYamlScalar(node.type)}`);
    lines.push('    payload:');

    if (node.type === 'source') {
      lines.push(`      kind: ${quoteYamlScalar(node.payload.kind)}`);
      lines.push(`      schema: ${quoteYamlScalar(node.payload.schema)}`);
      lines.push(`      table: ${quoteYamlScalar(node.payload.table)}`);
      lines.push(`      alias: ${quoteYamlScalar(node.payload.alias)}`);
      continue;
    }

    if (node.type === 'sql_transform') {
      lines.push(`      dialect: ${quoteYamlScalar(node.payload.dialect)}`);
      lines.push(`      entrypoint: ${quoteYamlScalar(node.payload.entrypoint)}`);
      lines.push('      sqlArtifact:');
      lines.push(`        repo: ${quoteYamlScalar(node.payload.sqlArtifact.repo)}`);
      lines.push(`        path: ${quoteYamlScalar(node.payload.sqlArtifact.path)}`);
      lines.push(`        ref: ${quoteYamlScalar(node.payload.sqlArtifact.ref)}`);
      lines.push(`        commitSha: ${quoteYamlScalar(node.payload.sqlArtifact.commitSha)}`);
      lines.push(
        `        contentSha256: ${quoteYamlScalar(node.payload.sqlArtifact.contentSha256)}`
      );
      continue;
    }

    lines.push(`      kind: ${quoteYamlScalar(node.payload.kind)}`);
    lines.push(`      schema: ${quoteYamlScalar(node.payload.schema)}`);
    lines.push(`      table: ${quoteYamlScalar(node.payload.table)}`);
    lines.push(`      materialization: ${quoteYamlScalar(node.payload.materialization)}`);
    lines.push(`      writeMode: ${quoteYamlScalar(node.payload.writeMode)}`);
  }

  lines.push('edges:');
  if (designGraphDraft.edges.length === 0) {
    lines.push('  []');
  } else {
    for (const edge of designGraphDraft.edges) {
      lines.push(`  - fromNodeId: ${quoteYamlScalar(edge.fromNodeId)}`);
      lines.push(`    toNodeId: ${quoteYamlScalar(edge.toNodeId)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function buildPreviewDesignGraphDraft(args: {
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  scopedNodeIds: readonly string[];
  sqlArtifact: GitArtifactRef;
  context: PreviewArtifactContext;
}): DesignGraphDraft {
  const scopedNodeIdSet = new Set(args.scopedNodeIds);
  const scopedNodes = args.nodes
    .filter((node) => scopedNodeIdSet.has(node.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  const scopedEdges = args.edges
    .filter((edge) => scopedNodeIdSet.has(edge.sourceId) && scopedNodeIdSet.has(edge.targetId))
    .sort((left, right) =>
      left.sourceId === right.sourceId
        ? left.targetId.localeCompare(right.targetId)
        : left.sourceId.localeCompare(right.sourceId)
    );

  return {
    context: {
      tenantId: args.context.tenantId,
      projectId: args.context.projectId,
      environmentId: args.context.environmentId,
      executionTarget: 'postgres',
    },
    nodes: scopedNodes.map((node) => {
      const role = resolveNodeRole(node);
      if (role === 'source') {
        return requireSourcePayload(node);
      }
      if (role === 'sql_transform') {
        return requireTransformPayload(node, args.sqlArtifact);
      }
      return requireSinkPayload(node);
    }),
    edges: scopedEdges.map((edge) => ({
      fromNodeId: edge.sourceId,
      toNodeId: edge.targetId,
    })),
  };
}

function quoteYamlScalar(value: string): string {
  return JSON.stringify(value);
}
