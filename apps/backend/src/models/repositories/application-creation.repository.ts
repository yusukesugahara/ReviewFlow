import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApplicationStatus,
  type ApplicationStatusValue,
} from '../constants/application-status';
import { FormDefinitionStatus } from '../constants/form-definition-status';
import { ApplicationFieldValue } from '../entities/application-field-value.entity';
import { Application } from '../entities/application.entity';
import { FormDefinition } from '../entities/form-definition.entity';

export type CreateApplicationValue = {
  formFieldId: string;
  valueJson: unknown;
};

@Injectable()
export class ApplicationCreationRepository {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(FormDefinition)
    private readonly templates: Repository<FormDefinition>,
  ) {}

  findPublishedTemplate(params: {
    tenantId: string;
    groupId: string;
    formDefinitionId?: string;
  }): Promise<FormDefinition | null> | Promise<FormDefinition[]> {
    if (params.formDefinitionId) {
      return this.templates.findOne({
        where: {
          id: params.formDefinitionId,
          tenantId: params.tenantId,
          groupId: params.groupId,
          status: FormDefinitionStatus.PUBLISHED,
        },
        relations: ['fields'],
      });
    }
    return this.templates.find({
      where: {
        tenantId: params.tenantId,
        groupId: params.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
    });
  }

  async createApplicationWithValues(params: {
    tenantId: string;
    groupId: string;
    applicantUserId: string | null;
    applicantEmail: string;
    formDefinitionId: string;
    approvalFlowId: string;
    status: ApplicationStatusValue;
    values: CreateApplicationValue[];
  }): Promise<string> {
    let newId = '';
    await this.apps.manager.transaction(async (em) => {
      const appRepo = em.getRepository(Application);
      const valRepo = em.getRepository(ApplicationFieldValue);
      const app = appRepo.create({
        tenantId: params.tenantId,
        groupId: params.groupId,
        applicantUserId: params.applicantUserId,
        applicantEmail: params.applicantEmail,
        formDefinitionId: params.formDefinitionId,
        approvalFlowId: params.approvalFlowId,
        status:
          params.status === ApplicationStatus.PUBLISHED
            ? ApplicationStatus.PUBLISHED
            : ApplicationStatus.DRAFT,
        currentStepOrder: null,
        submittedAt: null,
      });
      const saved = await appRepo.save(app);
      newId = saved.id;
      for (const value of params.values) {
        await valRepo.save(
          valRepo.create({
            tenantId: params.tenantId,
            applicationId: saved.id,
            formFieldId: value.formFieldId,
            valueJson: value.valueJson,
          }),
        );
      }
    });
    return newId;
  }

  findCreatedApplication(
    tenantId: string,
    id: string,
  ): Promise<Application | null> {
    return this.apps.findOne({
      where: { id, tenantId },
      relations: [
        'fieldValues',
        'fieldValues.formField',
        'formDefinition',
        'approvalFlow',
        'approvalFlow.steps',
      ],
    });
  }
}
