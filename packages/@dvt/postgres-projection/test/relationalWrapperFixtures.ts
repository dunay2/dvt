import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';

import type { DvtSubstraitJoinDraft } from '../src/substraitJoinReadModel.js';

export function wrapperFixture(
  base: 'join' | 'set',
  wrapper: 'aggregate' | 'window'
): DvtSubstraitJoinDraft {
  const file =
    base === 'set'
      ? 'set-documents'
      : `${wrapper === 'aggregate' ? 'grouped' : 'windowed'}-left-join-document`;
  const json = JSON.parse(
    readFileSync(new URL(`./fixtures/${file}.json`, import.meta.url), 'utf8')
  );
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(
    base === 'set'
      ? json[wrapper === 'aggregate' ? 'unionDistinctAggregate' : 'unionDistinctWindow']
      : json
  );
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}
