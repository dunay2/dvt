/** Owned concern: project one secret-free dbt execution target for product presentation. */
import type { DbtExecutionTargetIdentity } from '@dvt/contracts';

export type DbtExecutionTargetBindingReadModel = Readonly<{
  executor: string;
  adapter: string;
  target: string;
  connection: string;
  resolution: string;
}>;

export function projectDbtExecutionTargetBinding(
  target: DbtExecutionTargetIdentity,
  environmentDefaultLabel: string
): DbtExecutionTargetBindingReadModel {
  return {
    executor: target.provider,
    adapter: target.adapter,
    target: target.targetName,
    connection: `${target.connectionRef.provider} / ${target.connectionRef.connectionId}`,
    resolution: environmentDefaultLabel,
  };
}
