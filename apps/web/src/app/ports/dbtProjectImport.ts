/** Owned concern: expose protected dbt project validation and import to Web orchestration. */
import type {
  DbtProjectImportCommand,
  DbtProjectImportResult,
  DbtProjectImportValidationReport,
  ValidateDbtProjectImportRequest,
} from '@dvt/contracts';

export interface IDbtProjectImportPort {
  validateProject(
    request: ValidateDbtProjectImportRequest
  ): Promise<DbtProjectImportValidationReport>;
  importProject(command: DbtProjectImportCommand): Promise<DbtProjectImportResult>;
}
