/**
 * @file packages/@dvt/engine/test/contracts/run-golden-paths.hash.test.ts
 * @baseline ADR-0004: Event Sourcing Strategy (ExecutionPlan determinism)
 * @decision Validates deterministic SHA256 hashes of plan fixtures against .golden/hashes.json
 * @consequence Any change to a plan fixture that shifts its normalized hash fails CI immediately
 *
 * Validates:
 *   - ExecutionPlan serialization is stable and deterministic
 *   - Plan fixtures have not drifted from the committed baseline
 *
 * Scope: plan-level hash determinism only. Does NOT execute plans.
 * See issue #70 for full execution golden paths.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it } from 'vitest';

// ESM-safe __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function normalize(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalize);
  if (obj !== null && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    Object.keys(obj as object)
      .sort()
      .forEach((k) => {
        out[k] = normalize((obj as Record<string, unknown>)[k]);
      });
    return out;
  }
  return obj;
}

function computeHash(plan: unknown): string {
  const normalized = JSON.stringify(normalize(plan));
  return sha256HexUtf8(normalized).substring(0, 16);
}

// ────────────────────────────────────────────────────────────────────────────
// Baseline loading
// ────────────────────────────────────────────────────────────────────────────

interface PathEntry {
  description: string;
  hash: string;
  status: 'implemented' | 'deprecated' | 'not-implemented';
  location?: string;
  replacedBy?: string;
}

interface GoldenBaseline {
  version: string;
  paths: Record<string, PathEntry>;
}

const BASELINE_PATH = path.resolve(__dirname, '../../../../../.golden/hashes.json');
const PLANS_DIR = path.resolve(__dirname, 'plans');

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('golden path baseline hashes', () => {
  const baseline: GoldenBaseline | null = (() => {
    try {
      return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as GoldenBaseline;
    } catch {
      return null;
    }
  })();

  if (!baseline) {
    it('baseline file must exist at .golden/hashes.json', () => {
      throw new Error(`Baseline not found: ${BASELINE_PATH}`);
    });
    return;
  }

  const implemented = Object.entries(baseline.paths).filter(
    ([, info]) => info.status === 'implemented'
  );

  if (implemented.length === 0) {
    it('at least one implemented golden path must exist', () => {
      throw new Error('No implemented golden paths found in baseline');
    });
    return;
  }

  for (const [name, info] of implemented) {
    it(`${name}: normalized hash matches baseline`, () => {
      const planFile = path.resolve(PLANS_DIR, `${name}.json`);

      expect(
        fs.existsSync(planFile),
        `Plan fixture missing: ${planFile}\nBaseline expects: ${name}.json in ${PLANS_DIR}`
      ).toBe(true);

      const plan: unknown = JSON.parse(fs.readFileSync(planFile, 'utf8'));
      const actualHash = computeHash(plan);

      expect(actualHash).toBe(info.hash);
    });
  }
});
