import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { ApplicationStatus } from '../../../../../models/constants/application-status';
import { Application } from '../../../../../models/entities/application.entity';
import { ApplicationCreationRepository } from '../../../../../models/repositories/application-creation.repository';
import type { CreateApplicationDto } from '../../dto/applications.dto';
import { ApplicationCreationContextLoader } from './application-creation-context.loader';
import { ApplicationInitialFieldValueBuilder } from './application-initial-field-value.builder';

@Injectable()
export class ApplicationCreationService {
  constructor(
    private readonly creationRepository: ApplicationCreationRepository,
    private readonly contextLoader: ApplicationCreationContextLoader,
    private readonly initialFieldValueBuilder: ApplicationInitialFieldValueBuilder,
  ) {}

  async create(
    tenantId: string,
    applicantEmail: string,
    applicantUserId: string | null,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    const { template, flow } = await this.contextLoader.load(tenantId, dto);
    const values = this.initialFieldValueBuilder.build(
      template,
      dto.values ?? {},
    );

    const newId = await this.creationRepository.createApplicationWithValues({
      tenantId,
      groupId: dto.groupId,
      applicantUserId,
      applicantEmail,
      formDefinitionId: template.id,
      approvalFlowId: flow.id,
      status:
        dto.status === ApplicationStatus.PUBLISHED
          ? ApplicationStatus.PUBLISHED
          : ApplicationStatus.DRAFT,
      values,
    });

    return this.loadCreatedApplication(tenantId, newId);
  }

  private async loadCreatedApplication(
    tenantId: string,
    id: string,
  ): Promise<Application> {
    const created = await this.creationRepository.findCreatedApplication(
      tenantId,
      id,
    );
    if (!created) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return created;
  }
}
