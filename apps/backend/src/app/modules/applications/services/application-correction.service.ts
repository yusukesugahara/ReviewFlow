import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { Application } from '../../../../models/entities/application.entity';
import { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { ApplicationsRepository } from '../../../../models/repositories/applications.repository';
import type {
  CorrectionTargetsResponseDto,
  ReturnApplicationDto,
} from '../dto/applications.dto';
import { mapCorrectionsList } from '../mappers/applications.mapper';

@Injectable()
export class ApplicationCorrectionService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
  ) {}

  async listCorrections(tenantId: string, app: Application) {
    const rows = await this.applicationsRepository.listCorrections(
      tenantId,
      app.id,
    );
    return mapCorrectionsList(rows);
  }

  async buildTargetsResponse(
    app: Application,
  ): Promise<CorrectionTargetsResponseDto> {
    const open = await this.findOpenCorrectionWithItems(app.tenantId, app.id);

    if (!open) {
      return {
        applicationId: app.id,
        applicationStatus: app.status,
        openCorrection: null,
      };
    }

    const valueByFieldId = new Map(
      (app.fieldValues ?? []).map((value) => [
        value.formFieldId,
        value.valueJson,
      ]),
    );

    const items = (open.items ?? []).map((item) => {
      const field = item.formField;
      return {
        itemId: item.id,
        formFieldId: item.formFieldId,
        fieldKey: field?.fieldKey ?? '',
        label: field?.label ?? '',
        fieldType: field?.fieldType ?? '',
        required: field?.required ?? false,
        comment: item.comment,
        currentValue: valueByFieldId.has(item.formFieldId)
          ? valueByFieldId.get(item.formFieldId)
          : null,
      };
    });

    return {
      applicationId: app.id,
      applicationStatus: app.status,
      openCorrection: {
        id: open.id,
        overallComment: open.overallComment,
        createdAt: open.createdAt.toISOString(),
        items,
      },
    };
  }

  async getReturnEmailContext(
    app: Application,
  ): Promise<{ template: FormDefinition; dto: ReturnApplicationDto }> {
    const openCorrection = await this.findOpenCorrection(app.id);
    if (!openCorrection) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_OPEN_CORRECTION);
    }

    const template = await this.applicationsRepository.findTemplateByIdInGroup({
      tenantId: app.tenantId,
      groupId: app.groupId,
      formDefinitionId: app.formDefinitionId,
    });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return {
      template,
      dto: {
        overallComment: openCorrection.overallComment ?? undefined,
        fields: (openCorrection.items ?? []).map((item) => ({
          fieldId: item.formFieldId,
          comment: item.comment ?? undefined,
        })),
      },
    };
  }

  private async findOpenCorrection(
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    return this.applicationsRepository.findOpenCorrection(applicationId);
  }

  private async findOpenCorrectionWithItems(
    tenantId: string,
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    return this.applicationsRepository.findLatestOpenCorrectionWithItems(
      tenantId,
      applicationId,
    );
  }
}
