import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  type ApplicationAccessMailInput,
  type ApplicationReturnedMailInput,
  type ApplicationSubmittedMailInput,
  type EmailChangeConfirmationMailInput,
  type InvitationMailInput,
  MailMessageFactory,
  type PasswordResetMailInput,
  type SendMailInput,
} from './mail-message.factory';

/**
 * Nodemailer によるメール配送と配送設定解決を扱う service。
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly messageFactory: MailMessageFactory,
  ) {}

  /**
   * 招待メールを送信する。
   * @param input 招待メール入力
   */
  async sendInvitationEmail(input: InvitationMailInput): Promise<void> {
    await this.send(this.messageFactory.buildInvitationEmail(input));
  }

  /**
   * 公開申請アクセスメールを送信する。
   * @param input 公開申請アクセスメール入力
   */
  async sendApplicationAccessEmail(
    input: ApplicationAccessMailInput,
  ): Promise<void> {
    await this.send(this.messageFactory.buildApplicationAccessEmail(input));
  }

  /**
   * 差し戻し通知メールを送信する。
   * @param input 差し戻し通知メール入力
   */
  async sendApplicationReturnedEmail(
    input: ApplicationReturnedMailInput,
  ): Promise<void> {
    await this.send(this.messageFactory.buildApplicationReturnedEmail(input));
  }

  /**
   * 申請受付通知メールを送信する。
   * @param input 申請受付通知メール入力
   */
  async sendApplicationSubmittedEmail(
    input: ApplicationSubmittedMailInput,
  ): Promise<void> {
    await this.send(this.messageFactory.buildApplicationSubmittedEmail(input));
  }

  /**
   * パスワード再設定メールを送信する。
   * @param input パスワード再設定メール入力
   */
  async sendPasswordResetEmail(input: PasswordResetMailInput): Promise<void> {
    await this.send(this.messageFactory.buildPasswordResetEmail(input));
  }

  /**
   * メールアドレス変更確認メールを送信する。
   * @param input メールアドレス変更確認メール入力
   */
  async sendEmailChangeConfirmationEmail(
    input: EmailChangeConfirmationMailInput,
  ): Promise<void> {
    await this.send(
      this.messageFactory.buildEmailChangeConfirmationEmail(input),
    );
  }

  /**
   * メール配送が有効な場合に Nodemailer でメールを送信する。
   * @param input メール送信入力
   */
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

  /**
   * 環境変数からメール配送の有効/無効を判定する。
   * @returns メール配送が有効か
   */
  private isMailDeliveryEnabled(): boolean {
    const raw = this.configService.get<string>('MAIL_ENABLED');
    if (raw === undefined) {
      return this.configService.get<string>('NODE_ENV') !== 'test';
    }
    return raw === '1' || raw.toLowerCase() === 'true';
  }

  /**
   * 公開申請アクセスURLを組み立てる。
   * @param accessToken 申請者アクセストークン
   * @returns 公開申請アクセスURL
   */
  buildApplicationAccessUrl(accessToken: string): string {
    return this.messageFactory.buildApplicationAccessUrl(accessToken);
  }

  /**
   * provider 設定に応じた Nodemailer transporter を遅延生成して返す。
   * @returns Nodemailer transporter
   */
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

  /**
   * メール provider を環境変数から解決する。
   * @returns メール provider
   */
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

  /**
   * 必須環境変数を取得する。
   * @param key 環境変数名
   * @returns 環境変数値
   */
  private getRequired(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value?.length) {
      throw new Error(`${key} is required for mail delivery`);
    }
    return value;
  }

  /**
   * 複数候補のうち最初に設定されている必須環境変数を取得する。
   * @param keys 環境変数名候補
   * @returns 環境変数値
   */
  private getFirstRequired(keys: readonly string[]): string {
    for (const key of keys) {
      const value = this.configService.get<string>(key);
      if (value?.length) {
        return value;
      }
    }
    throw new Error(`${keys.join(' or ')} is required for mail delivery`);
  }

  /**
   * boolean 環境変数を解釈する。
   * @param key 環境変数名
   * @param fallback 未設定時の値
   * @returns boolean 値
   */
  private getBoolean(key: string, fallback: boolean): boolean {
    const value = this.configService.get<string>(key);
    if (value === undefined) {
      return fallback;
    }
    return value === '1' || value.toLowerCase() === 'true';
  }
}
