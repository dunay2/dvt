import type { CoreNodeRole } from '../../types/canonical';

type TransformationAuthoringGuardResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: string;
    };

type GuardArgs = {
  existingRoles: CoreNodeRole[];
  nextRole: CoreNodeRole;
};

const ALLOWED_ROLES: ReadonlySet<CoreNodeRole> = new Set(['input', 'transform', 'output']);

function isTransformationAuthoringContext(existingRoles: CoreNodeRole[]): boolean {
  return existingRoles.every((role) => ALLOWED_ROLES.has(role));
}

function countRoles(
  existingRoles: CoreNodeRole[]
): Record<'input' | 'transform' | 'output', number> {
  return existingRoles.reduce(
    (acc, role) => {
      if (role === 'input' || role === 'transform' || role === 'output') {
        acc[role] += 1;
      }
      return acc;
    },
    { input: 0, transform: 0, output: 0 }
  );
}

export function guardTransformationAuthoringNode({
  existingRoles,
  nextRole,
}: GuardArgs): TransformationAuthoringGuardResult {
  if (!isTransformationAuthoringContext(existingRoles)) {
    return { allowed: true };
  }

  if (!ALLOWED_ROLES.has(nextRole)) {
    return {
      allowed: false,
      reason: 'Transformation draft supports only input, transform, and output nodes.',
    };
  }

  if (existingRoles.length >= 3) {
    return {
      allowed: false,
      reason: 'Transformation draft allows exactly 3 nodes: source, sql_transform, and sink.',
    };
  }

  const roleCounts = countRoles(existingRoles);
  if (
    (nextRole === 'input' && roleCounts.input >= 1) ||
    (nextRole === 'transform' && roleCounts.transform >= 1) ||
    (nextRole === 'output' && roleCounts.output >= 1)
  ) {
    return {
      allowed: false,
      reason: 'Transformation draft allows exactly one node per role (input, transform, output).',
    };
  }

  return { allowed: true };
}
