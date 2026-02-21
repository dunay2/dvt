import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

function normalize(obj: any): any {
  if (Array.isArray(obj)) return obj.map(normalize);
  if (obj && typeof obj === 'object') {
    const out: any = {};
    Object.keys(obj)
      .sort()
      .forEach((k) => {
        out[k] = normalize(obj[k]);
      });
    return out;
  }
  return obj;
}

function computeHash(plan: any): string {
  const normalized = JSON.stringify(normalize(plan));
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

describe('golden path baseline hashes', () => {
  const baselinePath = path.resolve(__dirname, '../../../../.golden/hashes.json');
  let baseline: any;
  try {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  } catch (err) {
    baseline = null;
  }

  if (!baseline) {
    it('baseline file should exist', () => {
      throw new Error('.golden/hashes.json not found or unreadable');
    });
    return;
  }

  for (const [name, info] of Object.entries(baseline.paths)) {
    if (info.status === 'implemented') {
      it(`${name} hash matches plan file`, () => {
        // plans are stored adjacent to this test file under ./plans
        const planFile = path.resolve(__dirname, 'plans', `${name}.json`);
        expect(fs.existsSync(planFile)).toBe(true);
        const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
        const hash = computeHash(plan);
        expect(hash).toBe(info.hash);
      });
    }
  }
});
