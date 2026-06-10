import { Injectable } from '@nestjs/common';
import { ApplicationFieldValue } from '../../../../models/entities/application-field-value.entity';
import { Application } from '../../../../models/entities/application.entity';
import { ApplicationSubmissionRepository } from '../../../../models/repositories/application-submission.repository';
import type { PatchApplicationDto } from '../dto/applications.dto';
import { ApplicationFieldValuePatchBuilder } from './application-field-value-patch.builder';
import { ApplicationPatchContextLoader } from './application-patch-context.loader';

@Injectable()
export class ApplicationFieldValuePatchService {
  constructor(
    private readonly submissionRepository: ApplicationSubmissionRepository,
    private readonly patchContextLoader: ApplicationPatchContextLoader,
    private readonly fieldValuePatchBuilder: ApplicationFieldValuePatchBuilder,
  ) {}

  async applyPatch(
    tenantId: string,
    app: Application,
    dto: PatchApplicationDto,
  ): Promise<void> {
    const context = await this.patchContextLoader.load(tenantId, app, dto);
    const fieldValues = await this.fieldValuePatchBuilder.build(
      context,
      dto.values ?? {},
    );
    await this.saveApplicationPatch(app, dto, fieldValues);
  }

  private async saveApplicationPatch(
    app: Application,
    dto: PatchApplicationDto,
    values: ApplicationFieldValue[],
  ): Promise<void> {
    if (
      !dto.formDefinitionId &&
      !dto.approvalFlowId &&
      !dto.status &&
      values.length === 0
    ) {
      return;
    }
    await this.submissionRepository.saveApplicationPatch({
      app,
      formDefinitionId: dto.formDefinitionId,
      approvalFlowId: dto.approvalFlowId,
      status: dto.status,
      values,
    });
  }
}
