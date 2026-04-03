import type { ExecutabilityValidationResult } from '@dvt/contracts';
import type { PoolClient } from 'pg';

import type { StoredPlanRow } from './PostgresPlanStore.mappers.js';
import { quoteIdentifier } from './sqlUtils.js';

type StoredPlanValidationState = 'PENDING_VALIDATION' | 'VALID' | 'INVALID';

export class PostgresExecutableBlobRepository {
  public constructor(private readonly schema: string) {}

  public async insertPendingPlan(
    client: PoolClient,
    input: {
      planId: string;
      planVersion: string;
      planUri: string;
      planSha256: string;
      schemaVersion: string;
      sizeBytes: number;
      requiresCapabilitiesJson: string;
      canonicalPlanJson: string;
      executablePlanJson: string;
    }
  ): Promise<StoredPlanRow | undefined> {
    const insertResult = await client.query<StoredPlanRow>(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.stored_plans (
          plan_id,
          plan_version,
          plan_uri,
          plan_sha256,
          schema_version,
          size_bytes,
          requires_capabilities,
          canonical_plan_json,
          executable_plan_json,
          validation_state,
          rejection_report_json,
          stored_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, 'PENDING_VALIDATION', NULL, NOW(), NOW()
        )
        ON CONFLICT (plan_id) DO NOTHING
        RETURNING
          plan_id,
          plan_version,
          plan_uri,
          plan_sha256,
          schema_version,
          size_bytes,
          requires_capabilities,
          canonical_plan_json,
          executable_plan_json,
          validation_state,
          stored_at::text AS stored_at_iso,
          updated_at::text AS updated_at_iso,
          rejection_report_json
      `,
      [
        input.planId,
        input.planVersion,
        input.planUri,
        input.planSha256,
        input.schemaVersion,
        input.sizeBytes,
        input.requiresCapabilitiesJson,
        input.canonicalPlanJson,
        input.executablePlanJson,
      ]
    );
    return insertResult.rows[0];
  }

  public async readStoredPlanRowForUpdate(
    client: PoolClient,
    planId: string
  ): Promise<StoredPlanRow | undefined> {
    const result = await client.query<StoredPlanRow>(
      `
        SELECT
          plan_id,
          plan_version,
          plan_uri,
          plan_sha256,
          schema_version,
          size_bytes,
          requires_capabilities,
          canonical_plan_json,
          executable_plan_json,
          validation_state,
          stored_at::text AS stored_at_iso,
          updated_at::text AS updated_at_iso,
          rejection_report_json
        FROM ${quoteIdentifier(this.schema)}.stored_plans
        WHERE plan_id = $1
        FOR UPDATE
      `,
      [planId]
    );
    return result.rows[0];
  }

  public async transitionValidationState(
    client: PoolClient,
    input: {
      planId: string;
      expectedState: 'PENDING_VALIDATION';
      nextState: 'VALID' | 'INVALID';
      report: (ExecutabilityValidationResult & { status: 'ERROR' }) | null;
    }
  ): Promise<void> {
    const current = await client.query<{ validation_state: StoredPlanValidationState }>(
      `
        SELECT validation_state
        FROM ${quoteIdentifier(this.schema)}.stored_plans
        WHERE plan_id = $1
        FOR UPDATE
      `,
      [input.planId]
    );

    const state = current.rows[0]?.validation_state;
    if (!state) {
      throw new Error(`PLAN_NOT_FOUND: ${input.planId}`);
    }
    if (state !== input.expectedState) {
      throw new Error(
        `PLAN_VALIDATION_STATE_INVALID_TRANSITION: ${input.planId}:${state}->${input.nextState}`
      );
    }

    await client.query(
      `
        UPDATE ${quoteIdentifier(this.schema)}.stored_plans
        SET validation_state = $2,
            rejection_report_json = $3::jsonb,
            updated_at = NOW()
        WHERE plan_id = $1
      `,
      [input.planId, input.nextState, JSON.stringify(input.report)]
    );
  }

  public async getValidationRecordRow(
    client: PoolClient,
    planId: string
  ): Promise<
    | {
        plan_id: string;
        validation_state: StoredPlanValidationState;
        stored_at_iso: string;
        updated_at_iso: string;
        rejection_report_json: unknown;
      }
    | undefined
  > {
    const result = await client.query<{
      plan_id: string;
      validation_state: StoredPlanValidationState;
      stored_at_iso: string;
      updated_at_iso: string;
      rejection_report_json: unknown;
    }>(
      `
        SELECT
          plan_id,
          validation_state,
          stored_at::text AS stored_at_iso,
          updated_at::text AS updated_at_iso,
          rejection_report_json
        FROM ${quoteIdentifier(this.schema)}.stored_plans
        WHERE plan_id = $1
      `,
      [planId]
    );
    return result.rows[0];
  }

  public async getExecutablePlanRow(
    client: PoolClient,
    planId: string
  ): Promise<
    | {
        executable_plan_json: string;
        validation_state: StoredPlanValidationState;
      }
    | undefined
  > {
    const result = await client.query<{
      executable_plan_json: string;
      validation_state: StoredPlanValidationState;
    }>(
      `
        SELECT executable_plan_json, validation_state
        FROM ${quoteIdentifier(this.schema)}.stored_plans
        WHERE plan_id = $1
      `,
      [planId]
    );
    return result.rows[0];
  }
}
