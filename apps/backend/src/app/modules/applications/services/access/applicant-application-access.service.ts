import { Injectable } from '@nestjs/common';
import type { ApplicantAccessTokenPayload } from '../../../auth/services/facades/auth.service';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import type { Application } from '../../../../../models/entities/application.entity';
import { ApplicationQueryRepository } from '../../../../../models/repositories/application-query.repository';

type ApplicantSession = ApplicantAccessTokenPayload;

@Injectable()
export class ApplicantApplicationAccessService {
  constructor(private readonly queryRepository: ApplicationQueryRepository) {}

  assertCanCreateInGroup(actor: ApplicantSession, groupId: string): void {
    if (groupId !== actor.groupId) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  async loadSubmittedApplication(
    tenantId: string,
    id: string,
    options: { detail: boolean },
  ): Promise<Application> {
    const row = await this.queryRepository.findById({
      tenantId,
      id,
      detail: options.detail,
    });
    if (!row) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return row;
  }

  async loadEditableApplication(
    actor: ApplicantSession,
    id: string,
  ): Promise<Application> {
    this.assertCanAccessApplication(actor, id);
    const app = await this.queryRepository.findApplicantEditable({
      id,
      tenantId: actor.tenantId,
      applicantUserId: undefined,
      applicantEmail: actor.email,
    });
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    this.assertApplicantGroupMatches(actor, app);
    return app;
  }

  async loadApplicationDetail(
    actor: ApplicantSession,
    id: string,
  ): Promise<Application> {
    this.assertCanAccessApplication(actor, id);
    const app = await this.queryRepository.findById({
      id,
      tenantId: actor.tenantId,
      detail: true,
    });
    if (!app) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    this.assertApplicantGroupMatches(actor, app);
    this.assertApplicantEmailMatches(actor, app);
    return app;
  }

  getTokenApplicationIdOrThrow(actor: ApplicantSession): string {
    if (!actor.applicationId) {
      throw clientError(ClientErrorCodes.APPLICATION_NOT_FOUND);
    }
    return actor.applicationId;
  }

  private assertCanAccessApplication(
    actor: ApplicantSession,
    id: string,
  ): void {
    if (actor.applicationId && actor.applicationId !== id) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  private assertApplicantGroupMatches(
    actor: ApplicantSession,
    app: Application,
  ): void {
    if (app.groupId !== actor.groupId) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }

  private assertApplicantEmailMatches(
    actor: ApplicantSession,
    app: Application,
  ): void {
    if (app.applicantEmail.toLowerCase() !== actor.email.toLowerCase()) {
      throw clientError(ClientErrorCodes.APPLICATION_ACCESS_DENIED);
    }
  }
}
