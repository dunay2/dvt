/**
 * @ownedConcern Owns object-store archive artifact export, verification, and cold-payload redaction.
 */
import type { EventEnvelope } from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import { buildArchiveUnitManifest } from './archiveArtifacts.js';
import type {
  ArchiveExportRequest,
  ArchiveExportedUnit,
  ArchiveVerificationRequest,
  IArchiveObjectStore,
  IRunArchiveExporter,
} from './archiveRuntime.js';

export interface ObjectStorageRunArchiveExporterOptions {
  objectStore: IArchiveObjectStore;
  prefix?: string;
  redactionPolicy?: ArchiveRedactionPolicy;
}

export interface ArchiveRedactionPolicy {
  /** Additional key names to redact; the built-in sensitive keys always remain active. */
  readonly sensitiveKeys?: readonly string[];
  readonly replacement?: string;
}

interface ArchiveUnitManifest {
  archiveUnitKey: string;
  tenantBucket: string;
  tenantIds: readonly string[];
  rowCount: number;
  minRunSeq: number;
  maxRunSeq: number;
  checksumSha256: string;
  objectKey: string;
  exportedAt: string;
}

export class ObjectStorageRunArchiveExporter implements IRunArchiveExporter {
  readonly archiveFormat = 'jsonl';
  readonly destinationKind: 'file' | 's3';

  private readonly objectStore: IArchiveObjectStore;
  private readonly prefix: string;
  private readonly redactionPolicy: ResolvedArchiveRedactionPolicy;

  constructor(options: ObjectStorageRunArchiveExporterOptions) {
    this.objectStore = options.objectStore;
    this.prefix = normalizePrefix(options.prefix ?? 'archive');
    this.destinationKind = resolveDestinationKind(options.objectStore);
    this.redactionPolicy = resolveArchiveRedactionPolicy(options.redactionPolicy);
  }

  async exportArchiveUnit(input: ArchiveExportRequest): Promise<ArchiveExportedUnit> {
    const events = sortArchiveEvents(redactArchiveEvents(input.events, this.redactionPolicy));
    const objectKey = buildEventsObjectKey(this.prefix, input.archiveUnitKey);
    const manifestObjectKey = buildManifestObjectKey(this.prefix, input.archiveUnitKey);
    const checksumObjectKey = buildChecksumObjectKey(this.prefix, input.archiveUnitKey);

    const eventsPayload = encodeEventsAsNdjson(events);
    const manifestResult = buildArchiveUnitManifest({
      archiveUnitKey: input.archiveUnitKey,
      tenantBucket: input.tenantBucket,
      objectKey,
      exportedAtIso: input.exportedAtIso,
      events,
    });

    const [eventsExists, manifestExists, checksumExists] = await Promise.all([
      this.objectStore.existsObject(objectKey),
      this.objectStore.existsObject(manifestObjectKey),
      this.objectStore.existsObject(checksumObjectKey),
    ]);

    const existingCount = [eventsExists, manifestExists, checksumExists].filter(Boolean).length;
    if (existingCount > 0 && existingCount < 3) {
      throw new Error('ARCHIVE_EXPORT_PARTIAL_EXISTS');
    }

    if (existingCount === 3) {
      const [eventsBuffer, manifestBuffer, checksumBuffer] = await Promise.all([
        this.objectStore.readObject(objectKey),
        this.objectStore.readObject(manifestObjectKey),
        this.objectStore.readObject(checksumObjectKey),
      ]);

      const existingManifest = parseArchiveManifest(manifestBuffer);
      const canonicalExistingManifest = jcsCanonicalize(existingManifest);
      const existingManifestSha256 = sha256HexUtf8(canonicalExistingManifest);
      const rebuiltFromExistingManifest = buildArchiveUnitManifest({
        archiveUnitKey: input.archiveUnitKey,
        tenantBucket: input.tenantBucket,
        objectKey,
        exportedAtIso: existingManifest.exportedAt,
        events,
      });

      const checksumMatches = checksumBuffer.toString('utf8').trim() === existingManifestSha256;
      const manifestMatches =
        rebuiltFromExistingManifest.canonicalManifestJson === canonicalExistingManifest;
      const eventsMatch = eventsBuffer.equals(eventsPayload);

      if (!checksumMatches || !manifestMatches || !eventsMatch) {
        throw new Error('ARCHIVE_EXPORT_CONFLICT');
      }

      return {
        archiveUnitKey: input.archiveUnitKey,
        tenantBucket: input.tenantBucket,
        tenantIds: rebuiltFromExistingManifest.manifest.tenantIds,
        rowCount: rebuiltFromExistingManifest.manifest.rowCount,
        minRunSeq: rebuiltFromExistingManifest.manifest.minRunSeq,
        maxRunSeq: rebuiltFromExistingManifest.manifest.maxRunSeq,
        objectKey,
        objectUri: this.objectStore.getObjectUri?.(objectKey) ?? buildExistingObjectUri(objectKey),
        manifestObjectKey,
        checksumObjectKey,
        checksumSha256: rebuiltFromExistingManifest.manifest.checksumSha256,
        manifestSha256: rebuiltFromExistingManifest.manifestSha256,
        exportedAtIso: rebuiltFromExistingManifest.manifest.exportedAt,
      };
    }

    const [eventsWrite] = await Promise.all([
      this.objectStore.putObject(objectKey, eventsPayload, 'application/x-ndjson; charset=utf-8'),
      this.objectStore.putObject(
        manifestObjectKey,
        Buffer.from(manifestResult.canonicalManifestJson, 'utf8'),
        'application/json; charset=utf-8'
      ),
      this.objectStore.putObject(
        checksumObjectKey,
        Buffer.from(`${manifestResult.manifestSha256}\n`, 'utf8'),
        'text/plain; charset=utf-8'
      ),
    ]);

    return {
      archiveUnitKey: input.archiveUnitKey,
      tenantBucket: input.tenantBucket,
      tenantIds: manifestResult.manifest.tenantIds,
      rowCount: manifestResult.manifest.rowCount,
      minRunSeq: manifestResult.manifest.minRunSeq,
      maxRunSeq: manifestResult.manifest.maxRunSeq,
      objectKey,
      objectUri: eventsWrite.uri,
      manifestObjectKey,
      checksumObjectKey,
      checksumSha256: manifestResult.manifest.checksumSha256,
      manifestSha256: manifestResult.manifestSha256,
      exportedAtIso: manifestResult.manifest.exportedAt,
    };
  }

  async verifyArchiveUnit(input: ArchiveVerificationRequest): Promise<void> {
    const manifestObjectKey = deriveSiblingObjectKey(input.objectKey, 'manifest.json');
    const checksumObjectKey = deriveSiblingObjectKey(input.objectKey, 'checksum.sha256');

    const [eventsExists, manifestExists, checksumExists] = await Promise.all([
      this.objectStore.existsObject(input.objectKey),
      this.objectStore.existsObject(manifestObjectKey),
      this.objectStore.existsObject(checksumObjectKey),
    ]);

    if (!eventsExists || !manifestExists || !checksumExists) {
      throw new Error('ARCHIVE_VERIFICATION_OBJECTS_MISSING');
    }

    const [eventsBuffer, manifestBuffer, checksumBuffer] = await Promise.all([
      this.objectStore.readObject(input.objectKey),
      this.objectStore.readObject(manifestObjectKey),
      this.objectStore.readObject(checksumObjectKey),
    ]);

    const events = parseNdjsonEvents(eventsBuffer);
    const manifest = parseArchiveManifest(manifestBuffer);

    const canonicalManifestJson = jcsCanonicalize(manifest);
    const manifestSha256 = sha256HexUtf8(canonicalManifestJson);
    if (checksumBuffer.toString('utf8').trim() !== manifestSha256) {
      throw new Error('ARCHIVE_MANIFEST_CHECKSUM_MISMATCH');
    }

    const rebuilt = buildArchiveUnitManifest({
      archiveUnitKey: input.archiveUnitKey,
      tenantBucket: input.tenantBucket,
      objectKey: input.objectKey,
      exportedAtIso: manifest.exportedAt,
      events,
    });

    if (manifest.archiveUnitKey !== input.archiveUnitKey) {
      throw new Error('ARCHIVE_MANIFEST_UNIT_KEY_MISMATCH');
    }
    if (manifest.tenantBucket !== input.tenantBucket) {
      throw new Error('ARCHIVE_MANIFEST_TENANT_BUCKET_MISMATCH');
    }
    if (manifest.objectKey !== input.objectKey) {
      throw new Error('ARCHIVE_MANIFEST_OBJECT_KEY_MISMATCH');
    }
    if (manifest.rowCount !== input.expectedRowCount) {
      throw new Error('ARCHIVE_MANIFEST_ROW_COUNT_MISMATCH');
    }
    if (manifest.checksumSha256 !== input.expectedChecksumSha256) {
      throw new Error('ARCHIVE_MANIFEST_EVENT_CHECKSUM_MISMATCH');
    }
    if (rebuilt.manifest.rowCount !== input.expectedRowCount) {
      throw new Error('ARCHIVE_REBUILT_ROW_COUNT_MISMATCH');
    }
    if (rebuilt.manifest.checksumSha256 !== input.expectedChecksumSha256) {
      throw new Error('ARCHIVE_REBUILT_EVENT_CHECKSUM_MISMATCH');
    }
    if (rebuilt.canonicalManifestJson !== canonicalManifestJson) {
      throw new Error('ARCHIVE_REBUILT_MANIFEST_MISMATCH');
    }
  }
}

interface ResolvedArchiveRedactionPolicy {
  readonly sensitiveKeys: ReadonlySet<string>;
  readonly replacement: string;
}

const DEFAULT_ARCHIVE_REDACTION_REPLACEMENT = '[REDACTED]';
const DEFAULT_ARCHIVE_REDACTION_KEYS: readonly string[] = [
  'apiKey',
  'authorization',
  'clientSecret',
  'connectionString',
  'credential',
  'credentials',
  'idToken',
  'password',
  'passphrase',
  'privateKey',
  'refreshToken',
  'secret',
  'token',
];

function resolveArchiveRedactionPolicy(
  policy: ArchiveRedactionPolicy | undefined
): ResolvedArchiveRedactionPolicy {
  return {
    sensitiveKeys: new Set(
      [...DEFAULT_ARCHIVE_REDACTION_KEYS, ...(policy?.sensitiveKeys ?? [])].map(normalizeKey)
    ),
    replacement: policy?.replacement ?? DEFAULT_ARCHIVE_REDACTION_REPLACEMENT,
  };
}

function redactArchiveEvents(
  events: readonly EventEnvelope[],
  policy: ResolvedArchiveRedactionPolicy
): readonly EventEnvelope[] {
  return events.map((event) => redactValue(event, policy) as EventEnvelope);
}

function redactValue(value: unknown, policy: ResolvedArchiveRedactionPolicy): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry, policy));
  }

  if (!isRecord(value)) {
    return value;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    redacted[key] = policy.sensitiveKeys.has(normalizeKey(key))
      ? policy.replacement
      : redactValue(child, policy);
  }
  return redacted;
}

function normalizeKey(key: string): string {
  return key.replace(/[-_\s]/g, '').toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || ArrayBuffer.isView(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function sortArchiveEvents(events: readonly EventEnvelope[]): readonly EventEnvelope[] {
  return [...events].sort((left, right) => {
    const tenantOrder = left.tenantId.localeCompare(right.tenantId);
    if (tenantOrder !== 0) return tenantOrder;

    const runOrder = left.runId.localeCompare(right.runId);
    if (runOrder !== 0) return runOrder;

    const runSeqOrder = left.runSeq - right.runSeq;
    if (runSeqOrder !== 0) return runSeqOrder;

    return left.eventType.localeCompare(right.eventType);
  });
}

function encodeEventsAsNdjson(events: readonly EventEnvelope[]): Buffer {
  const content = sortArchiveEvents(events)
    .map((event) => jcsCanonicalize(event))
    .join('\n');
  return Buffer.from(`${content}\n`, 'utf8');
}

function parseNdjsonEvents(buffer: Buffer): readonly EventEnvelope[] {
  const lines = buffer
    .toString('utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error('ARCHIVE_EVENTS_REQUIRED');
  }

  return lines.map((line) => JSON.parse(line) as EventEnvelope);
}

function parseArchiveManifest(manifestBuffer: Buffer): ArchiveUnitManifest {
  return JSON.parse(manifestBuffer.toString('utf8')) as ArchiveUnitManifest;
}

function buildEventsObjectKey(prefix: string, archiveUnitKey: string): string {
  return `${prefix}/${archiveUnitKey}/events.jsonl`;
}

function buildManifestObjectKey(prefix: string, archiveUnitKey: string): string {
  return `${prefix}/${archiveUnitKey}/manifest.json`;
}

function buildChecksumObjectKey(prefix: string, archiveUnitKey: string): string {
  return `${prefix}/${archiveUnitKey}/checksum.sha256`;
}

function deriveSiblingObjectKey(
  objectKey: string,
  fileName: 'manifest.json' | 'checksum.sha256'
): string {
  const trimmed = objectKey.trim();
  const slashIndex = trimmed.lastIndexOf('/');
  if (slashIndex < 0) {
    throw new Error('ARCHIVE_OBJECT_KEY_INVALID');
  }
  return `${trimmed.slice(0, slashIndex)}/${fileName}`;
}

function normalizePrefix(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

function resolveDestinationKind(objectStore: IArchiveObjectStore): 'file' | 's3' {
  const constructorName = objectStore.constructor?.name ?? '';
  if (constructorName.includes('S3')) {
    return 's3';
  }
  return 'file';
}

function buildExistingObjectUri(objectKey: string): string {
  return `existing://${objectKey}`;
}
