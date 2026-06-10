import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  type ApplicationAccessMailInput,
  type ApplicationReturnedMailInput,
  type InvitationMailInput,
  MailMessageFactory,
  type PasswordResetMailInput,
  type SendMailInput,
} from './mail-message.factory';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly messageFactory: MailMessageFactory,
  ) {}

  async sendInvitationEmail(input: InvitationMailInput): Promise<void> {
    await this.send(this.messageFactory.buildInvitationEmail(input));
  }

  async sendApplicationAccessEmail(
    input: ApplicationAccessMailInput,
  ): Promise<void> {
    await this.send(this.messageFactory.buildApplicationAccessEmail(input));
  }

  async sendApplicationReturnedEmail(
    input: ApplicationReturnedMailInput,
  ): Promise<void> {
    await this.send(this.messageFactory.buildApplicationReturnedEmail(input));
  }

  async sendPasswordResetEmail(input: PasswordResetMailInput): Promise<void> {
    await this.send(this.messageFactory.buildPasswordResetEmail(input));
  }

  async send(input: SendMailInput): Promise<void> {
    if (!this.isMailDeliveryEnabled()) {
      this.logger.warn(
        `mail delivery disabled; skipped email to ${input.to} with subject "${input.subject}"`,
      );
      return;
    }

    try {
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
    } catch (error) {
      this.logger.error(
        `mail delivery failed to ${input.to} with subject "${input.subject}"`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private isMailDeliveryEnabled(): boolean {
    const raw = this.configService.get<string>('MAIL_ENABLED');
    if (raw === undefined) {
      return this.configService.get<string>('NODE_ENV') !== 'test';
    }
    return raw === '1' || raw.toLowerCase() === 'true';
  }

  buildApplicationAccessUrl(accessToken: string): string {
    return this.messageFactory.buildApplicationAccessUrl(accessToken);
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
}
