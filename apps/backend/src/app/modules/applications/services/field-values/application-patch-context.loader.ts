import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import { CorrectionRequest } from '../../../../../models/entities/correction-request.entity';
import type { FormField } from '../../../../../models/entities/form-field.entity';
import { ApplicationCorrectionRepository } from '../../../../../models/repositories/application-correction.repository';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import type { TransactionManager } from '../../../../transaction';
import type { PatchApplicationDto } from '../../dto/applications.dto';
import { ApplicationPatchPolicy } from '../../policies/application-patch.policy';
import { ApplicationFormValueValidator } from '../../validators/application-form-value.validator';

export type ApplicationPatchContext = {
  app: Application;
  fieldsByKey: Map<string, FormField>;
  allowedFieldIds?: Set<string>;
};

@Injectable()
export class ApplicationPatchContextLoader {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly correctionRepository: ApplicationCorrectionRepository,
    private readonly patchPolicy: ApplicationPatchPolicy,
    private readonly formValueValidator: ApplicationFormValueValidator,
  ) {}

  async load(
    tenantId: string,
    app: Application,
    dto: PatchApplicationDto,
    manager?: TransactionManager,
  ): Promise<ApplicationPatchContext> {
    this.patchPolicy.assertPatchTargetEditable(app, dto);
    this.patchPolicy.assertFormDefinitionChangeAllowed(
      app,
      dto.formDefinitionId,
    );

    const template =
      await this.formDefinitionsRepository.findTemplateByIdInGroup({
        tenantId,
        groupId: app.groupId,
        formDefinitionId: dto.formDefinitionId ?? app.formDefinitionId,
        onlyPublished: !!dto.formDefinitionId,
      });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    const fieldsByKey = this.formValueValidator.buildFieldsByKey(
      template.fields ?? [],
    );
    const allowedFieldIds = await this.resolveAllowedFieldIds(app, manager);

    return { app, fieldsByKey, allowedFieldIds };
  }

  private async resolveAllowedFieldIds(
    app: Application,
    manager?: TransactionManager,
  ): Promise<Set<string> | undefined> {
    if (!this.patchPolicy.requiresCorrectionFieldScope(app)) {
      this.patchPolicy.assertFieldPatchAllowedWithoutCorrectionScope(app);
      return undefined;
    }

    const open = await this.findOpenCorrection(app, manager);
    if (!open?.items?.length) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_EDITABLE);
    }

    return new Set(open.items.map((item) => item.formFieldId));
  }

  private async findOpenCorrection(
    app: Application,
    manager?: TransactionManager,
  ): Promise<CorrectionRequest | null> {
    return this.correctionRepository.findOpenCorrection(
      { tenantId: app.tenantId, applicationId: app.id },
      manager,
    );
  }
}
