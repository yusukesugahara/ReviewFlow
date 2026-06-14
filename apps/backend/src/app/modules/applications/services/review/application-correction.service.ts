import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import { CorrectionRequest } from '../../../../../models/entities/correction-request.entity';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { ApplicationCorrectionRepository } from '../../../../../models/repositories/application-correction.repository';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import type {
  CorrectionTargetsResponseDto,
  ReturnApplicationEmailDto,
} from '../../dto/applications.dto';
import {
  mapCorrectionTargetsResponse,
  mapCorrectionToReturnApplicationDto,
  mapCorrectionsList,
} from '../../mappers/applications.mapper';

@Injectable()
export class ApplicationCorrectionService {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly correctionRepository: ApplicationCorrectionRepository,
  ) {}

  async listCorrections(tenantId: string, app: Application) {
    const rows = await this.correctionRepository.listCorrections(
      tenantId,
      app.id,
    );
    return mapCorrectionsList(rows);
  }

  async buildTargetsResponse(
    app: Application,
  ): Promise<CorrectionTargetsResponseDto> {
    const open = await this.findOpenCorrectionWithItems(app.tenantId, app.id);
    return mapCorrectionTargetsResponse(app, open);
  }

  async getReturnEmailContext(
    app: Application,
  ): Promise<{ template: FormDefinition; dto: ReturnApplicationEmailDto }> {
    const openCorrection = await this.findOpenCorrection(app);
    if (!openCorrection) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_OPEN_CORRECTION);
    }

    const template =
      await this.formDefinitionsRepository.findTemplateByIdInGroup({
        tenantId: app.tenantId,
        groupId: app.groupId,
        formDefinitionId: app.formDefinitionId,
      });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return {
      template,
      dto: mapCorrectionToReturnApplicationDto(openCorrection),
    };
  }

  private async findOpenCorrection(
    app: Application,
  ): Promise<CorrectionRequest | null> {
    return this.correctionRepository.findOpenCorrection({
      tenantId: app.tenantId,
      applicationId: app.id,
    });
  }

  private async findOpenCorrectionWithItems(
    tenantId: string,
    applicationId: string,
  ): Promise<CorrectionRequest | null> {
    return this.correctionRepository.findLatestOpenCorrectionWithItems(
      tenantId,
      applicationId,
    );
  }
}
