import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ClientErrorCodes, clientError } from '../../../../../common/errors';
import { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { FormDefinitionsRepository } from '../../../../../models/repositories/form-definitions.repository';
import { AuthService } from '../../../auth/services/facades/auth.service';
import type { ApplicantAccessTokenPayload } from '../../../auth/services/facades/auth.service';
import { MailService } from '../../../mail/services/mail.service';
import type { RequestFormAccessDto } from '../../dto/form-definitions.dto';

/**
 * 公開申請フォームへの申請者アクセス要求と applicant access token 発行を扱う service。
 */
@Injectable()
export class FormAccessRequestService {
  private readonly logger = new Logger(FormAccessRequestService.name);

  constructor(
    private readonly formDefinitionsRepository: FormDefinitionsRepository,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  /**
   * 申請者トークンの scope で公開フォーム定義を取得する。
   * @param actor 申請者トークン
   * @returns 公開フォーム定義
   */
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

  /**
   * 申請者に公開申請フォームへのアクセスメールを送信する。
   * @param groupId スペースID
   * @param dto アクセス要求DTO
   * @param formDefinitionId フォーム定義ID
   * @returns 受付結果
   */
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

  /**
   * アクセス要求対象の公開フォーム定義を解決する。
   * @param groupId スペースID
   * @param formDefinitionId フォーム定義ID
   * @returns 公開フォーム定義
   */
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
