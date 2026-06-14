import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { type ApplicationStatusValue } from '../constants/application-status';
import { CorrectionRequestStatus } from '../constants/correction-request-status';
import { ApplicationFieldValue } from '../entities/application-field-value.entity';
import { Application } from '../entities/application.entity';
import { CorrectionRequestItem } from '../entities/correction-request-item.entity';
import { CorrectionRequest } from '../entities/correction-request.entity';

@Injectable()
export class ApplicationSubmissionRepository {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(ApplicationFieldValue)
    private readonly fieldValues: Repository<ApplicationFieldValue>,
  ) {}

  findExistingFieldValues(
    applicationId: string,
  ): Promise<ApplicationFieldValue[]> {
    return this.fieldValues.find({ where: { applicationId } });
  }

  createFieldValue(params: {
    tenantId: string;
    applicationId: string;
    formFieldId: string;
    valueJson: unknown;
  }): ApplicationFieldValue {
    return this.fieldValues.create(params);
  }

  async saveApplicationPatch(
    params: {
      app: Application;
      formDefinitionId?: string;
      approvalFlowId?: string;
      status?: ApplicationStatusValue;
      values: ApplicationFieldValue[];
    },
    manager?: EntityManager,
  ): Promise<void> {
    if (
      !params.formDefinitionId &&
      !params.approvalFlowId &&
      !params.status &&
      params.values.length === 0
    ) {
      return;
    }
    const work = async (em: EntityManager) => {
      const appRepo = em.getRepository(Application);
      const valueRepo = em.getRepository(ApplicationFieldValue);
      if (params.formDefinitionId) {
        params.app.formDefinitionId = params.formDefinitionId;
        await valueRepo.delete({ applicationId: params.app.id });
      }
      if (params.approvalFlowId) {
        params.app.approvalFlowId = params.approvalFlowId;
      }
      if (params.status) {
        params.app.status = params.status;
      }
      if (params.formDefinitionId || params.approvalFlowId || params.status) {
        await appRepo.save(params.app);
      }
      if (params.values.length > 0) {
        await valueRepo.save(params.values);
      }
    };
    if (manager) {
      await work(manager);
    } else {
      await this.apps.manager.transaction(work);
    }
  }

  async saveSubmittedApplication(
    app: Application,
    manager?: EntityManager,
  ): Promise<void> {
    const work = async (em: EntityManager) => {
      await em.getRepository(Application).save(app);
    };
    if (manager) {
      await work(manager);
    } else {
      await this.apps.manager.transaction(work);
    }
  }

  async saveResubmittedApplication(
    params: {
      app: Application;
      openCorrection: CorrectionRequest;
    },
    manager?: EntityManager,
  ): Promise<void> {
    const work = async (em: EntityManager) => {
      const corrRepo = em.getRepository(CorrectionRequest);
      const itemRepo = em.getRepository(CorrectionRequestItem);
      const appRepo = em.getRepository(Application);

      params.openCorrection.status = CorrectionRequestStatus.RESOLVED;
      params.openCorrection.resolvedAt = new Date();
      await corrRepo.save(params.openCorrection);

      for (const item of params.openCorrection.items ?? []) {
        item.isResolved = true;
        await itemRepo.save(item);
      }

      await appRepo.save(params.app);
    };
    if (manager) {
      await work(manager);
    } else {
      await this.apps.manager.transaction(work);
    }
  }
}
