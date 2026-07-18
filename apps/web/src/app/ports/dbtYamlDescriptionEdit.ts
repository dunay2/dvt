/** Owned concern: expose governed dbt YAML description transactions to web orchestration. */
import type {
  ApplyDbtYamlDescriptionEditRequest,
  DbtYamlDescriptionAppliedReceipt,
  DbtYamlDescriptionEditProposal,
  DbtYamlDescriptionRevertedReceipt,
  ProposeDbtYamlDescriptionEditRequest,
  RevertDbtYamlDescriptionEditRequest,
} from '@dvt/contracts';

export interface IDbtYamlDescriptionEditPort {
  propose(request: ProposeDbtYamlDescriptionEditRequest): Promise<DbtYamlDescriptionEditProposal>;
  apply(request: ApplyDbtYamlDescriptionEditRequest): Promise<DbtYamlDescriptionAppliedReceipt>;
  revert(request: RevertDbtYamlDescriptionEditRequest): Promise<DbtYamlDescriptionRevertedReceipt>;
}
