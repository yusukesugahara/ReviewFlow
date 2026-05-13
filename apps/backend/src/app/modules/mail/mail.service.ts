import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type InvitationMailInput = {
  to: string;
  invitedByEmail: string;
  acceptToken: string;
  expiresAtIso: string;
  role: string;
  nextPath?: string;
};

type ApplicationAccessMailInput = {
  to: string;
  templateName: string;
  accessToken: string;
};

type ApplicationReturnedMailInput = {
  to: string;
  applicationId: string;
  groupId: string;
  templateName: string;
  overallComment?: string | null;
  fields: Array<{
    label: string;
    comment?: string | null;
  }>;
};

type PasswordResetMailInput = {
  to: string;
  resetToken: string;
  expiresAtIso: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendInvitationEmail(input: InvitationMailInput): Promise<void> {
    const acceptUrl = this.buildFrontendUrl('/invitations/accept', {
      token: input.acceptToken,
      ...(input.nextPath ? { next: input.nextPath } : {}),
    });

    await this.send({
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
    });
  }

  async sendApplicationAccessEmail(
    input: ApplicationAccessMailInput,
  ): Promise<void> {
    const accessUrl = this.buildFrontendUrl('/apply/access', {
      token: input.accessToken,
    });

    await this.send({
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
    });
  }

  async sendApplicationReturnedEmail(
    input: ApplicationReturnedMailInput,
  ): Promise<void> {
    const detailUrl = this.buildFrontendUrl(
      `/space/${encodeURIComponent(input.groupId)}/applications/${encodeURIComponent(input.applicationId)}`,
    );
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

    await this.send({
      to: input.to,
      subject: `ReviewFlow ${input.templateName} が差し戻されました`,
      text: [
        `${input.templateName} の申請が差し戻されました。`,
        input.overallComment?.trim()
          ? `全体コメント: ${input.overallComment.trim()}`
          : null,
        '修正対象:',
        ...fieldLines,
        `申請詳細: ${detailUrl}`,
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
        `<p><a href="${this.escapeHtml(detailUrl)}">申請詳細を開く</a></p>`,
      ].join(''),
    });
  }

  async sendPasswordResetEmail(input: PasswordResetMailInput): Promise<void> {
    const resetUrl = this.buildFrontendUrl('/password-reset', {
      token: input.resetToken,
    });

    await this.send({
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
    });
  }

  async send(input: SendMailInput): Promise<void> {
    if (!this.isMailEnabled()) {
      this.logger.debug(`mail disabled; skipped delivery to ${input.to}`);
      return;
    }

    const transporter = this.getTransporter();
    const from = this.getRequired('MAIL_FROM');
    const replyTo =
      this.configService.get<string>('MAIL_REPLY_TO') || undefined;

    await transporter.sendMail({
      from,
      replyTo,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }

  private isMailEnabled(): boolean {
    const raw = this.configService.get<string>('MAIL_ENABLED');
    if (raw === undefined) {
      return this.configService.get<string>('NODE_ENV') !== 'test';
    }
    return raw === '1' || raw.toLowerCase() === 'true';
  }

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const provider = this.resolveProvider();
    this.transporter =
      provider === 'smtp'
        ? nodemailer.createTransport({
            host: this.getRequired('MAIL_SMTP_HOST'),
            port: Number(
              this.configService.get<string>('MAIL_SMTP_PORT') ?? 587,
            ),
            secure: this.getBoolean('MAIL_SMTP_SECURE', false),
            auth: {
              user: this.getRequired('MAIL_SMTP_USER'),
              pass: this.getRequired('MAIL_SMTP_PASSWORD'),
            },
          })
        : nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: this.getFirstRequired(['MAIL_GMAIL_USER', 'GMAIL_USER']),
              pass: this.getFirstRequired([
                'MAIL_GMAIL_APP_PASSWORD',
                'GMAIL_APP_PASSWORD',
              ]),
            },
          });

    return this.transporter;
  }

  private resolveProvider(): 'gmail' | 'smtp' {
    const configured = this.configService
      .get<string>('MAIL_PROVIDER')
      ?.toLowerCase();
    if (configured === 'gmail' || configured === 'smtp') {
      return configured;
    }
    return this.configService.get<string>('NODE_ENV') === 'production'
      ? 'smtp'
      : 'gmail';
  }

  private getRequired(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value?.length) {
      throw new Error(`${key} is required for mail delivery`);
    }
    return value;
  }

  private getFirstRequired(keys: readonly string[]): string {
    for (const key of keys) {
      const value = this.configService.get<string>(key);
      if (value?.length) {
        return value;
      }
    }
    throw new Error(`${keys.join(' or ')} is required for mail delivery`);
  }

  private getBoolean(key: string, fallback: boolean): boolean {
    const value = this.configService.get<string>(key);
    if (value === undefined) {
      return fallback;
    }
    return value === '1' || value.toLowerCase() === 'true';
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
