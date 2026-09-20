import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';

import type { DvtSubstraitJoinDraft } from '../../src/substraitJoinReadModel.js';

const joinDocuments = JSON.parse(
  readFileSync(new URL('./inner-join-documents.json', import.meta.url), 'utf8')
) as Record<string, unknown>;

export function joinDraft(size: 'two' | 'three' = 'three'): DvtSubstraitJoinDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(joinDocuments[size]);
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}
