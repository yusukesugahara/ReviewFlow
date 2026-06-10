import { Injectable } from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import type { Application } from '../../../../models/entities/application.entity';
import type { CorrectionRequest } from '../../../../models/entities/correction-request.entity';
import type { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { ApplicationCorrectionRepository } from '../../../../models/repositories/application-correction.repository';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import { ApplicationTransitionPolicy } from '../policies/application-transition.policy';

export type SubmittableApplicationContext = {
  app: Application;
  template: FormDefinition;
};

export type ResubmittableApplicationContext = SubmittableApplicationContext & {
  openCorrection: CorrectionRequest;
};

@Injectable()
export class ApplicationSubmissionContextLoader {
  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly correctionRepository: ApplicationCorrectionRepository,
    private readonly transitionPolicy: ApplicationTransitionPolicy,
  ) {}

  async loadSubmittable(
    tenantId: string,
    app: Application,
  ): Promise<SubmittableApplicationContext> {
    this.transitionPolicy.assertDraft(app);
    const template = await this.loadTemplate(tenantId, app);

    return { app, template };
  }

  async loadResubmittable(
    tenantId: string,
    app: Application,
  ): Promise<ResubmittableApplicationContext> {
    this.transitionPolicy.assertReturned(app);

    const openCorrection = await this.correctionRepository.findOpenCorrection(
      app.id,
    );
    if (!openCorrection) {
      throw clientError(ClientErrorCodes.APPLICATION_NO_OPEN_CORRECTION);
    }

    const template = await this.loadTemplate(tenantId, app);

    return { app, template, openCorrection };
  }

  private async loadTemplate(
    tenantId: string,
    app: Application,
  ): Promise<FormDefinition> {
    const template =
      await this.formDefinitionsRepository.findTemplateByIdInGroup({
        tenantId,
        groupId: app.groupId,
        formDefinitionId: app.formDefinitionId,
      });
    if (!template) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }

    return template;
  }
}
