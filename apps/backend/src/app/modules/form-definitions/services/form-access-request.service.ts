import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../common/errors';
import { FormDefinition } from '../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../models/repositories/form-definitions.repository';
import { AuthService } from '../../auth/services/auth.service';
import type { ApplicantAccessTokenPayload } from '../../auth/services/auth.service';
import { MailService } from '../../mail/services/mail.service';
import type { RequestFormAccessDto } from '../dto/form-definitions.dto';

@Injectable()
export class FormAccessRequestService {
  private readonly logger = new Logger(FormAccessRequestService.name);

  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  async getPublishedDefinitionForApplicant(
    actor: ApplicantAccessTokenPayload,
  ): Promise<FormDefinition> {
    const definition =
      await this.formDefinitionsRepository.findPublishedForApplicant({
        tenantId: actor.tenantId,
        groupId: actor.groupId,
        formDefinitionId: actor.formDefinitionId,
      });
    if (!definition) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    return definition;
  }

  async requestAccess(
    groupId: string,
    dto: RequestFormAccessDto,
    formDefinitionId?: string,
  ): Promise<{ accepted: true }> {
    const definition = await this.findPublishedDefinitionForAccessRequest(
      groupId,
      formDefinitionId,
    );

    const email = dto.email.toLowerCase();
    const accessToken = this.authService.issueApplicantAccessToken({
      tenantId: definition.tenantId,
      email,
      groupId: definition.groupId,
      formDefinitionId: definition.id,
    });

    try {
      await this.mailService.sendApplicationAccessEmail({
        to: email,
        templateName: definition.name,
        accessToken,
      });
    } catch (error) {
      this.logger.error(
        `failed to send form access email for definition ${definition.id} to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'failed to send form access email',
      );
    }

    return { accepted: true };
  }

  private async findPublishedDefinitionForAccessRequest(
    groupId: string,
    formDefinitionId?: string,
  ): Promise<FormDefinition> {
    const definitions =
      await this.formDefinitionsRepository.findPublishedForAccessRequest({
        groupId,
        formDefinitionId,
      });
    if (!formDefinitionId && definitions.length > 1) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_AMBIGUOUS);
    }
    const definition = definitions[0];
    if (!definition) {
      throw clientError(ClientErrorCodes.FORM_DEFINITION_NOT_FOUND);
    }
    return definition;
  }
}
