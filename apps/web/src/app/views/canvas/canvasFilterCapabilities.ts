/** Semantic Filter capabilities, independent of the eventual execution target. */
import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  buildDvtSubstraitStandardCapabilityId,
} from '@dvt/contracts';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';

const supported = new Set(
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries
    .filter((entry) => entry.profileStatus === 'supported-profile')
    .map((entry) => entry.entryId)
);
const filterId = buildDvtSubstraitStandardCapabilityId('relation', {
  sourceKind: 'core',
  message: 'substrait.FilterRel',
});
const textTypes = new Set(['text', 'string', 'varchar', 'character varying', 'char']);
export function resolveDvtSubstraitFilterCapabilities(args: Readonly<{ dataType: string }>) {
  return supported.has(filterId) && textTypes.has(args.dataType.trim().toLowerCase())
    ? dvtSubstraitTextComparison.capabilities
        .filter((entry) => supported.has(entry.capabilityId))
        .map((entry) => ({ capabilityId: entry.capabilityId, name: entry.operator }))
    : [];
}
