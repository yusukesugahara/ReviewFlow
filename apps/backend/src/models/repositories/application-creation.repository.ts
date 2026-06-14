import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  ApplicationStatus,
  type ApplicationStatusValue,
} from '../constants/application-status';
import { ApplicationFieldValue } from '../entities/application-field-value.entity';
import { Application } from '../entities/application.entity';

export type CreateApplicationValue = {
  formFieldId: string;
  valueJson: unknown;
};

@Injectable()
export class ApplicationCreationRepository {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
  ) {}

  async createApplicationWithValues(
    params: {
      tenantId: string;
      groupId: string;
      applicantUserId: string | null;
      applicantEmail: string;
      formDefinitionId: string;
      approvalFlowId: string;
      status: ApplicationStatusValue;
      values: CreateApplicationValue[];
    },
    manager?: EntityManager,
  ): Promise<string> {
    let newId = '';
    const work = async (em: EntityManager) => {
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
    };
    if (manager) {
      await work(manager);
    } else {
      await this.apps.manager.transaction(work);
    }
    return newId;
  }

  findCreatedApplication(
    tenantId: string,
    id: string,
    manager?: EntityManager,
  ): Promise<Application | null> {
    const repository = manager?.getRepository(Application) ?? this.apps;
    return repository.findOne({
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
