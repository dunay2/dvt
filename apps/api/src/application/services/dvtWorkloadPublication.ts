/**
 * @baseline ADR-0064 / ADR-0066: semantic result disposition and publication are separate.
 * @decision Validate one protected publication intent before SQL artifact or plan writes.
 * @consequence Projection and lowering share fail-closed disposition/target policy.
 * @version 1.0.0
 */
import {
  DVT_REJECTIONS,
  DvtPostgresRelationTargetV1Schema,
  DvtTransformResultTargetV1Schema,
  type DvtOperationalRunWorkloadV1,
  type DvtOperationalRejection,
} from '@dvt/contracts';

import { sameConnection } from './dvtSourceCoverage.js';
import type { DvtTerminalTransformClosure } from './resolveDvtTerminalTransformClosure.js';

type PublicationResolution =
  | {
      readonly ok: true;
      readonly intent: null | Pick<DvtOperationalRunWorkloadV1, 'output' | 'publicationBoundaries'>;
    }
  | ({ readonly ok: false } & DvtOperationalRejection);

export function resolveDvtWorkloadPublication(
  closure: DvtTerminalTransformClosure
): PublicationResolution {
  const config = closure.transform.metadata?.['config'];
  if (closure.sink !== undefined) return resolveSinkPublication(closure, config);
  if (config === undefined) return { ok: true, intent: null };
  if (!isRecord(config)) return { ok: false, ...DVT_REJECTIONS.runConfigInvalid };
  if (!Object.hasOwn(config, 'materialized') && !Object.hasOwn(config, 'resultTarget')) {
    return { ok: true, intent: null };
  }
  if (config['materialized'] === 'ephemeral') {
    return { ok: false, ...DVT_REJECTIONS.runSinkRequired };
  }
  if (config['materialized'] !== 'table') {
    return { ok: false, ...DVT_REJECTIONS.runDispositionUnsupported };
  }
  const target = DvtTransformResultTargetV1Schema.safeParse(config['resultTarget']);
  if (!target.success) return { ok: false, ...DVT_REJECTIONS.runTargetInvalid };
  if (!sameConnection(target.data.connectionRef, closure.connectionRef)) {
    return { ok: false, ...DVT_REJECTIONS.previewWorkloadProjectionFailed };
  }
  return {
    ok: true,
    intent: {
      output: {
        kind: 'transform-result',
        nodeId: closure.transform.id,
        disposition: 'table',
        target: target.data,
        publicationPolicy: 'postgres-stable-table-publication.v1',
      },
      publicationBoundaries: [],
    },
  };
}

function resolveSinkPublication(
  closure: DvtTerminalTransformClosure,
  transformConfig: unknown
): PublicationResolution {
  if (
    isRecord(transformConfig) &&
    (transformConfig['materialized'] === 'table' || Object.hasOwn(transformConfig, 'resultTarget'))
  ) {
    return { ok: false, ...DVT_REJECTIONS.runPublicationConflict };
  }
  if (!isRecord(transformConfig) || transformConfig['materialized'] !== 'ephemeral') {
    return { ok: false, ...DVT_REJECTIONS.runSinkTransformDispositionInvalid };
  }
  const sink = closure.sink!;
  const config = sink.metadata?.['config'];
  if (
    !isRecord(config) ||
    config['materialization'] !== 'table' ||
    config['writeMode'] !== 'replace' ||
    Object.hasOwn(config, 'resultTarget')
  ) {
    return { ok: false, ...DVT_REJECTIONS.runTargetInvalid };
  }
  const target = DvtPostgresRelationTargetV1Schema.safeParse({
    connectionRef: config['connectionRef'],
    schema: config['schema'],
    relation: config['table'],
  });
  if (!target.success || !sameConnection(target.data.connectionRef, closure.connectionRef)) {
    return { ok: false, ...DVT_REJECTIONS.runTargetInvalid };
  }
  return {
    ok: true,
    intent: {
      output: { kind: 'transform-result', nodeId: closure.transform.id, disposition: 'ephemeral' },
      publicationBoundaries: [
        {
          kind: 'sink',
          nodeId: sink.id,
          inputNodeId: closure.transform.id,
          target: target.data,
          publicationPolicy: 'postgres-stable-table-publication.v1',
        },
      ],
    },
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
