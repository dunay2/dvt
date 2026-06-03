/**
 * Owned concern: allocate platform-owned, time-sortable execution identity at
 * the protected start-run boundary without owning runtime lifecycle semantics.
 */
import { randomBytes } from 'node:crypto';

export type StartRunRunIdGenerator = () => string;

export function generatePlatformRunId(): string {
  return `run_${generateUuidV7()}`;
}

function generateUuidV7(nowMs = Date.now(), random = randomBytes(10)): string {
  const timestamp = Math.min(Math.max(0, nowMs), 0xffffffffffff);
  const bytes = new Uint8Array(16);

  bytes[0] = Math.floor(timestamp / 0x10000000000) & 0xff;
  bytes[1] = Math.floor(timestamp / 0x100000000) & 0xff;
  bytes[2] = Math.floor(timestamp / 0x1000000) & 0xff;
  bytes[3] = Math.floor(timestamp / 0x10000) & 0xff;
  bytes[4] = Math.floor(timestamp / 0x100) & 0xff;
  bytes[5] = timestamp & 0xff;
  bytes[6] = 0x70 | (readByte(random, 0) & 0x0f);
  bytes[7] = readByte(random, 1);
  bytes[8] = 0x80 | (readByte(random, 2) & 0x3f);
  bytes.set(random.subarray(3, 10), 9);

  return formatUuid(bytes);
}

function readByte(bytes: Uint8Array, index: number): number {
  return bytes[index] ?? 0;
}

function formatUuid(bytes: Uint8Array): string {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
