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
  applicationPath: string;
  templateName: string;
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
    const loginUrl = this.buildFrontendUrl('/login', {
      next: input.applicationPath,
    });

    await this.send({
      to: input.to,
      subject: `ReviewFlow ${input.templateName} の申請案内`,
      text: [
        `${input.templateName} の申請案内です。`,
        '以下のURLからログインすると、対象フォームを開けます。',
        `ログインURL: ${loginUrl}`,
      ].join('\n'),
      html: [
        `<p>${this.escapeHtml(input.templateName)} の申請案内です。</p>`,
        '<p>以下のURLからログインすると、対象フォームを開けます。</p>',
        `<p><a href="${this.escapeHtml(loginUrl)}">申請フォームを開く</a></p>`,
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
              user: this.getRequired('MAIL_GMAIL_USER'),
              pass: this.getRequired('MAIL_GMAIL_APP_PASSWORD'),
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
