import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import type { Application } from '../../../../models/entities/application.entity';
import type { PatchApplicationDto } from '../dto/applications.dto';

@Injectable()
export class ApplicationPatchPolicy {
  assertPatchTargetEditable(app: Application, dto: PatchApplicationDto): void {
    if (this.requiresCorrectionFieldScope(app) && this.changesMetadata(dto)) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }

    if (dto.status && !this.isDraftOrPublished(app)) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
  }

  assertFormDefinitionChangeAllowed(
    app: Application,
    formDefinitionId?: string,
  ): void {
    if (formDefinitionId && !this.isDraftOrPublished(app)) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
  }

  assertFieldPatchAllowedWithoutCorrectionScope(app: Application): void {
    if (!this.isDraftOrPublished(app)) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }
  }

  requiresCorrectionFieldScope(app: Application): boolean {
    return app.status === ApplicationStatus.RETURNED;
  }

  private changesMetadata(dto: PatchApplicationDto): boolean {
    return !!(dto.formDefinitionId || dto.approvalFlowId || dto.status);
  }

  private isDraftOrPublished(app: Application): boolean {
    return (
      app.status === ApplicationStatus.DRAFT ||
      app.status === ApplicationStatus.PUBLISHED
    );
  }
}
