import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type InvitationMailInput = {
  to: string;
  invitedByEmail: string;
  acceptToken: string;
  expiresAtIso: string;
  role: string;
  nextPath?: string;
};

export type ApplicationAccessMailInput = {
  to: string;
  templateName: string;
  accessToken: string;
};

export type ApplicationReturnedMailInput = {
  to: string;
  applicationId: string;
  accessToken: string;
  groupId: string;
  templateName: string;
  overallComment?: string | null;
  fields: Array<{
    label: string;
    comment?: string | null;
  }>;
};

export type PasswordResetMailInput = {
  to: string;
  resetToken: string;
  expiresAtIso: string;
};

@Injectable()
export class MailMessageFactory {
  constructor(private readonly configService: ConfigService) {}

  buildInvitationEmail(input: InvitationMailInput): SendMailInput {
    const acceptUrl = this.buildFrontendUrl('/invitations/accept', {
      token: input.acceptToken,
      ...(input.nextPath ? { next: input.nextPath } : {}),
    });

    return {
      to: input.to,
      subject: 'ReviewFlow 招待のお知らせ',
      text: [
        'ReviewFlow への招待が届いています。',
        `招待元: ${input.invitedByEmail}`,
        `ロール: ${input.role}`,
        `招待URL: ${acceptUrl}`,
        `有効期限: ${input.expiresAtIso}`,
      ].join('\n'),
      html: [
        '<p>ReviewFlow への招待が届いています。</p>',
        `<p>招待元: ${this.escapeHtml(input.invitedByEmail)}</p>`,
        `<p>ロール: ${this.escapeHtml(input.role)}</p>`,
        `<p><a href="${this.escapeHtml(acceptUrl)}">招待を受け取る</a></p>`,
        `<p>有効期限: ${this.escapeHtml(input.expiresAtIso)}</p>`,
      ].join(''),
    };
  }

  buildApplicationAccessEmail(
    input: ApplicationAccessMailInput,
  ): SendMailInput {
    const accessUrl = this.buildApplicationAccessUrl(input.accessToken);

    return {
      to: input.to,
      subject: `ReviewFlow ${input.templateName} の申請案内`,
      text: [
        `${input.templateName} の申請案内です。`,
        '以下のURLから申請フォームを開いてください。',
        `申請URL: ${accessUrl}`,
      ].join('\n'),
      html: [
        `<p>${this.escapeHtml(input.templateName)} の申請案内です。</p>`,
        '<p>以下のURLから申請フォームを開いてください。</p>',
        `<p><a href="${this.escapeHtml(accessUrl)}">申請フォームを開く</a></p>`,
      ].join(''),
    };
  }

  buildApplicationReturnedEmail(
    input: ApplicationReturnedMailInput,
  ): SendMailInput {
    const correctionUrl = this.buildFrontendUrl('/apply/access', {
      token: input.accessToken,
      next: '/apply/correction',
    });
    const fieldLines = input.fields.map((field) =>
      field.comment?.trim().length
        ? `- ${field.label}: ${field.comment.trim()}`
        : `- ${field.label}`,
    );
    const escapedFieldItems = input.fields.map((field) => {
      const comment = field.comment?.trim();
      return comment
        ? `<li>${this.escapeHtml(field.label)}: ${this.escapeHtml(comment)}</li>`
        : `<li>${this.escapeHtml(field.label)}</li>`;
    });

    return {
      to: input.to,
      subject: `ReviewFlow ${input.templateName} が差し戻されました`,
      text: [
        `${input.templateName} の申請が差し戻されました。`,
        input.overallComment?.trim()
          ? `全体コメント: ${input.overallComment.trim()}`
          : null,
        '修正対象:',
        ...fieldLines,
        `修正URL: ${correctionUrl}`,
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
      html: [
        `<p>${this.escapeHtml(input.templateName)} の申請が差し戻されました。</p>`,
        input.overallComment?.trim()
          ? `<p>全体コメント: ${this.escapeHtml(input.overallComment.trim())}</p>`
          : '',
        '<p>修正対象:</p>',
        `<ul>${escapedFieldItems.join('')}</ul>`,
        `<p><a href="${this.escapeHtml(correctionUrl)}">修正画面を開く</a></p>`,
      ].join(''),
    };
  }

  buildPasswordResetEmail(input: PasswordResetMailInput): SendMailInput {
    const resetUrl = this.buildFrontendUrl('/password-reset', {
      token: input.resetToken,
    });

    return {
      to: input.to,
      subject: 'ReviewFlow パスワード再設定のお知らせ',
      text: [
        'ReviewFlow のパスワード再設定リクエストを受け付けました。',
        `再設定URL: ${resetUrl}`,
        `有効期限: ${input.expiresAtIso}`,
        '心当たりがない場合は、このメールを破棄してください。',
      ].join('\n'),
      html: [
        '<p>ReviewFlow のパスワード再設定リクエストを受け付けました。</p>',
        `<p><a href="${this.escapeHtml(resetUrl)}">パスワードを再設定する</a></p>`,
        `<p>有効期限: ${this.escapeHtml(input.expiresAtIso)}</p>`,
        '<p>心当たりがない場合は、このメールを破棄してください。</p>',
      ].join(''),
    };
  }

  buildApplicationAccessUrl(accessToken: string): string {
    return this.buildFrontendUrl('/apply/access', {
      token: accessToken,
    });
  }

  private buildFrontendUrl(
    path: string,
    params?: Record<string, string>,
  ): string {
    const frontendBaseUrl =
      this.configService.get<string>('FRONTEND_BASE_URL') ??
      'http://localhost:3001';
    const url = new URL(path, frontendBaseUrl.replace(/\/$/, '') + '/');
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return url.toString();
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
