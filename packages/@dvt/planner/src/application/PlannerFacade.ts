/** Owned concern: expose the planner bounded-context public boundary for plan build and selected-closure derivation. */
import {
  ContractValidationError,
  parseGenericGraphSourceV1,
  parseExecutionSelection,
  parsePlannerInputEnvelopeV1,
  WorkspaceGraphAuthoringDraftSchema,
} from '@dvt/contracts';

import { PlannerError, PlannerErrorCode } from '../domain/errors.js';
import { Planner, type PlannerOptions } from '../domain/Planner.js';
import type { PlannerInputEnvelopeV1 as DomainEnvelope } from '../domain/types.js';

import {
  ExecutableSubgraphDeriver,
  type DeriveExecutableSubgraphInput,
} from './ExecutableSubgraphDeriver.js';
import { PlannerEnvelopeMapper } from './PlannerEnvelopeMapper.js';

type IPlanner = import('@dvt/contracts').IPlanner;
type ExecutableSubgraph = import('@dvt/contracts').ExecutableSubgraph;
type PlannerBuildResultV1 = import('@dvt/contracts').PlannerBuildResultV1;
type GenericGraphSourceV1 = import('@dvt/contracts').GenericGraphSourceV1SchemaT;
type ContractEnvelope = import('@dvt/contracts').PlannerInputEnvelopeV1;
type PlannerInputEnvelopeV1SchemaT = import('@dvt/contracts').PlannerInputEnvelopeV1SchemaT;
type ExecutionSelection = import('@dvt/contracts').ExecutionSelection;
type WorkspaceGraphAuthoringDraft = import('@dvt/contracts').WorkspaceGraphAuthoringDraft;

export interface PlannerFacadeOptions extends PlannerOptions {}

export class PlannerFacade implements IPlanner {
  private readonly planner: Planner;
  private readonly envelopeMapper: PlannerEnvelopeMapper;
  private readonly executableSubgraphDeriver: ExecutableSubgraphDeriver;

  constructor(options?: PlannerFacadeOptions) {
    const plannerOptions = options ?? {};
    this.planner = new Planner(plannerOptions);
    this.envelopeMapper = new PlannerEnvelopeMapper();
    this.executableSubgraphDeriver = new ExecutableSubgraphDeriver(
      plannerOptions.limits === undefined ? undefined : { limits: plannerOptions.limits }
    );
  }

  async buildPlan(input: ContractEnvelope): Promise<PlannerBuildResultV1> {
    const domainInput = await this.toDomainInput(this.validateEnvelope(input));
    return this.planner.buildPlan(domainInput);
  }

  deriveExecutableSubgraph(input: DeriveExecutableSubgraphInput): ExecutableSubgraph {
    return this.executableSubgraphDeriver.derive({
      draft: this.validateWorkspaceGraphAuthoringDraft(input.draft),
      selection: this.validateExecutionSelection(input.selection),
    });
  }

  private async toDomainInput(input: PlannerInputEnvelopeV1SchemaT): Promise<DomainEnvelope> {
    const domainRest = this.envelopeMapper.toDomainBaseInput(input);
    const graphSource = input.graphSource;

    if (graphSource !== undefined) {
      return {
        ...domainRest,
        graphSource: this.envelopeMapper.toInternalGraphSource(
          this.validateGraphSource(graphSource)
        ),
      };
    }

    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'No graph source provided after input normalization.'
    );
  }

  private validateEnvelope(input: ContractEnvelope): PlannerInputEnvelopeV1SchemaT {
    try {
      return parsePlannerInputEnvelopeV1(input);
    } catch (error) {
      const message =
        error instanceof ContractValidationError &&
        error.details.length > 0 &&
        error.details.every(
          (detail) => detail.path === 'graphSource' || detail.path.startsWith('graphSource.')
        )
          ? 'graphSource failed contract validation.'
          : 'Planner input failed contract validation.';

      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, message, error);
    }
  }

  private validateGraphSource(graphSource: unknown): GenericGraphSourceV1 {
    try {
      return parseGenericGraphSourceV1(graphSource);
    } catch (error) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'graphSource failed contract validation.',
        error
      );
    }
  }

  private validateExecutionSelection(selection: unknown): ExecutionSelection {
    try {
      return parseExecutionSelection(selection);
    } catch (error) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'selection failed contract validation.',
        error
      );
    }
  }

  private validateWorkspaceGraphAuthoringDraft(draft: unknown): WorkspaceGraphAuthoringDraft {
    try {
      return WorkspaceGraphAuthoringDraftSchema.parse(draft);
    } catch (error) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'draft failed contract validation.',
        error
      );
    }
  }
}
