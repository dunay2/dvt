import type { CoreNodeRole } from '../../types/canonical';

type TransformationAuthoringGuardResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: string;
    };

type GuardArgs = {
  authoringModeEnabled: boolean;
  existingRoles: CoreNodeRole[];
  nextRole: CoreNodeRole;
};

export function guardTransformationAuthoringNode({
  authoringModeEnabled: _authoringModeEnabled,
  existingRoles: _existingRoles,
  nextRole: _nextRole,
}: GuardArgs): TransformationAuthoringGuardResult {
  // Planning still enforces the v1 source -> sql_transform -> sink contract,
  // but canvas authoring remains unrestricted so larger graphs can be composed.
  return { allowed: true };
}
