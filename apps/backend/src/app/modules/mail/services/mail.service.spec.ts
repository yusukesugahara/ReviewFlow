import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailMessageFactory } from './mail-message.factory';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

/**
 * MailService のテスト
 *
 * @group mail-service
 */
describe('MailService', () => {
  const sendMail = jest.fn();
  const createTransport = jest.mocked(nodemailer.createTransport);

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue(undefined);
    const transporter = {
      sendMail,
    } as unknown as ReturnType<typeof nodemailer.createTransport>;
    createTransport.mockReturnValue(transporter);
  });

  function createService(config: ConfigService): MailService {
    return new MailService(config, new MailMessageFactory(config));
  }

  /**
   * Gmail トランスポートを使用すること
   */
  it('uses Gmail transport outside production by default', async () => {
    const config = new ConfigService({
      NODE_ENV: 'development',
      MAIL_ENABLED: '1',
      MAIL_FROM: 'noreply@example.com',
      MAIL_GMAIL_USER: 'gmail-user@example.com',
      MAIL_GMAIL_APP_PASSWORD: 'app-password',
    });
    const service = createService(config);

    await service.send({
      to: 'user@example.com',
      subject: 'subject',
      text: 'text',
      html: '<p>text</p>',
    });

    expect(createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: {
        user: 'gmail-user@example.com',
        pass: 'app-password',
      },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'user@example.com',
        subject: 'subject',
      }),
    );
  });

  /**
   * SMTP トランスポートを使用すること
   */
  it('uses SMTP transport in production by default', async () => {
    const config = new ConfigService({
      NODE_ENV: 'production',
      MAIL_ENABLED: '1',
      MAIL_FROM: 'noreply@example.com',
      MAIL_SMTP_HOST: 'smtp.example.com',
      MAIL_SMTP_PORT: '465',
      MAIL_SMTP_SECURE: 'true',
      MAIL_SMTP_USER: 'smtp-user',
      MAIL_SMTP_PASSWORD: 'smtp-pass',
    });
    const service = createService(config);

    await service.send({
      to: 'user@example.com',
      subject: 'subject',
      text: 'text',
      html: '<p>text</p>',
    });

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: {
        user: 'smtp-user',
        pass: 'smtp-pass',
      },
    });
  });

  /**
   * メールが無効な場合に配信をスキップすること
   */
  it('skips delivery when mail is disabled', async () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      MAIL_ENABLED: '0',
    });
    const service = createService(config);

    await service.send({
      to: 'user@example.com',
      subject: 'subject',
      text: 'text',
      html: '<p>text</p>',
    });

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('sends generated application returned email messages', async () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      MAIL_ENABLED: '1',
      MAIL_FROM: 'noreply@example.com',
      MAIL_PROVIDER: 'smtp',
      MAIL_SMTP_HOST: 'smtp.example.com',
      MAIL_SMTP_USER: 'smtp-user',
      MAIL_SMTP_PASSWORD: 'smtp-pass',
      FRONTEND_BASE_URL: 'https://review.example.com',
    });
    const service = createService(config);

    await service.sendApplicationReturnedEmail({
      to: 'applicant@example.com',
      applicationId: 'app-1',
      accessToken: 'return-token',
      groupId: 'group-1',
      templateName: '経費申請',
      overallComment: '内容を確認してください',
      fields: [{ label: '備考', comment: '詳細を追記してください' }],
    });

    type SentMail = {
      to?: string;
      subject?: string;
      text?: string;
      html?: string;
    };
    const calls = sendMail.mock.calls as Array<[SentMail]>;
    const sent = calls[0]?.[0];
    expect(sent?.to).toBe('applicant@example.com');
    expect(sent?.subject).toBe('ReviewFlow 経費申請 が差し戻されました');
    expect(sent?.text).toContain('備考: 詳細を追記してください');
    expect(sent?.html).toContain('修正画面を開く');
  });

  it('sends generated application submitted email messages', async () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      MAIL_ENABLED: '1',
      MAIL_FROM: 'noreply@example.com',
      MAIL_PROVIDER: 'smtp',
      MAIL_SMTP_HOST: 'smtp.example.com',
      MAIL_SMTP_USER: 'smtp-user',
      MAIL_SMTP_PASSWORD: 'smtp-pass',
      FRONTEND_BASE_URL: 'https://review.example.com',
    });
    const service = createService(config);

    await service.sendApplicationSubmittedEmail({
      to: 'applicant@example.com',
      applicationId: 'app-1',
      accessToken: 'submitted-token',
      templateName: '経費申請',
    });

    type SentMail = {
      to?: string;
      subject?: string;
      text?: string;
      html?: string;
    };
    const calls = sendMail.mock.calls as Array<[SentMail]>;
    const sent = calls[0]?.[0];
    expect(sent?.to).toBe('applicant@example.com');
    expect(sent?.subject).toBe('ReviewFlow 経費申請 の申請を受け付けました');
    expect(sent?.text).toContain('申請内容を確認できます');
    expect(sent?.html).toContain('申請内容を確認する');
  });
});
