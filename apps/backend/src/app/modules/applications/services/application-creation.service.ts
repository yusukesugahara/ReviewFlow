import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { ApplicationStatus } from '../../../../models/constants/application-status';
import { FormDefinitionStatus } from '../../../../models/constants/form-definition-status';
import { ApplicationFieldValue } from '../../../../models/entities/application-field-value.entity';
import { Application } from '../../../../models/entities/application.entity';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import type { CreateApplicationDto } from '../dto/applications.dto';
import { ApplicationApprovalFlowResolver } from '../resolvers/application-approval-flow.resolver';
import { ApplicationFormValueValidator } from '../validators/application-form-value.validator';

@Injectable()
export class ApplicationCreationService {
  constructor(
    @InjectRepository(Application)
    private readonly apps: Repository<Application>,
    @InjectRepository(ApplicationFieldValue)
    private readonly fieldValues: Repository<ApplicationFieldValue>,
    @InjectRepository(FormDefinition)
    private readonly templates: Repository<FormDefinition>,
    private readonly flowResolver: ApplicationApprovalFlowResolver,
    private readonly formValueValidator: ApplicationFormValueValidator,
  ) {}

  async create(
    tenantId: string,
    applicantEmail: string,
    applicantUserId: string | null,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    const template = await this.resolvePublishedTemplate(tenantId, dto);
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    const values = dto.values ?? {};
    const fieldsByKey = this.formValueValidator.buildFieldsByKey(
      template.fields ?? [],
    );
    this.formValueValidator.assertValuesMatchFields(fieldsByKey, values);

    const flow = await this.flowResolver.resolveActiveFlow(
      tenantId,
      dto.groupId,
      dto.approvalFlowId,
    );

    let newId = '';
    await this.apps.manager.transaction(async (em) => {
      const appRepo = em.getRepository(Application);
      const valRepo = em.getRepository(ApplicationFieldValue);
      const app = appRepo.create({
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
        currentStepOrder: null,
        submittedAt: null,
      });
      const saved = await appRepo.save(app);
      newId = saved.id;
      for (const [key, val] of Object.entries(values)) {
        const field = this.formValueValidator.getKnownField(fieldsByKey, key);
        await valRepo.save(
          valRepo.create({
            tenantId,
            applicationId: saved.id,
            formFieldId: field.id,
            valueJson: val,
          }),
        );
      }
    });

    return this.loadCreatedApplication(tenantId, newId);
  }

  private async resolvePublishedTemplate(
    tenantId: string,
    dto: CreateApplicationDto,
  ): Promise<FormDefinition | null> {
    if (dto.formDefinitionId) {
      return this.templates.findOne({
        where: {
          id: dto.formDefinitionId,
          tenantId,
          groupId: dto.groupId,
          status: FormDefinitionStatus.PUBLISHED,
        },
        relations: ['fields'],
      });
    }

    const templates = await this.templates.find({
      where: {
        tenantId,
        groupId: dto.groupId,
        status: FormDefinitionStatus.PUBLISHED,
      },
      relations: ['fields'],
    });
    if (templates.length > 1) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_AMBIGUOUS);
    }
    return templates[0] ?? null;
  }

  private async loadCreatedApplication(
    tenantId: string,
    id: string,
  ): Promise<Application> {
    const created = await this.apps.findOne({
      where: { id, tenantId },
      relations: [
        'fieldValues',
        'fieldValues.formField',
        'formDefinition',
        'approvalFlow',
        'approvalFlow.steps',
      ],
    });
    if (!created) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return created;
  }
}
