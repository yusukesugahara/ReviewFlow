import { Injectable, Logger } from '@nestjs/common';
import type { Application } from '../../../../../models/entities/application.entity';
import type { FormDefinition } from '../../../../../models/entities/form-definition.entity';
import { AuthService } from '../../../auth/services/facades/auth.service';
import { MailService } from '../../../mail/services/mail.service';
import type { ReturnApplicationEmailDto } from '../../dto/applications.dto';

/**
 * 申請関連の外部通知を扱う service。
 */
@Injectable()
export class ApplicationNotificationService {
  private readonly logger = new Logger(ApplicationNotificationService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  /**
   * 差し戻し修正用の申請者アクセストークンを発行し、差し戻しメールを送信する。
   *
   * 通知失敗で申請状態更新を巻き戻さないため、送信エラーは operational log に記録する。
   * @param app 申請
   * @param template フォーム定義
   * @param dto 差し戻しメールDTO
   */
  async notifyApplicantOfReturn(
    app: Application,
    template: FormDefinition,
    dto: ReturnApplicationEmailDto,
  ): Promise<void> {
    const fieldsById = new Map((template.fields ?? []).map((f) => [f.id, f]));
    const accessToken = this.authService.issueApplicantAccessToken({
      tenantId: app.tenantId,
      email: app.applicantEmail,
      groupId: app.groupId,
      formDefinitionId: app.formDefinitionId,
      applicationId: app.id,
    });
    try {
      await this.mailService.sendApplicationReturnedEmail({
        to: app.applicantEmail,
        applicationId: app.id,
        accessToken,
        groupId: app.groupId,
        templateName: template.name,
        overallComment: dto.overallComment ?? null,
        fields: dto.fields.map((field) => ({
          label: fieldsById.get(field.fieldId)?.label ?? field.fieldId,
          comment: field.comment ?? null,
        })),
      });
    } catch (error) {
      this.logger.error(
        `failed to send application return email for application ${app.id} to ${app.applicantEmail}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
