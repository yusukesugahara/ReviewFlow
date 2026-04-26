import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('MailService', () => {
  const sendMail = jest.fn();
  const createTransport = jest.mocked(nodemailer.createTransport);

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue(undefined);
    createTransport.mockReturnValue({
      sendMail,
    } as unknown as nodemailer.Transporter);
  });

  it('uses Gmail transport outside production by default', async () => {
    const config = new ConfigService({
      NODE_ENV: 'development',
      MAIL_ENABLED: '1',
      MAIL_FROM: 'noreply@example.com',
      MAIL_GMAIL_USER: 'gmail-user@example.com',
      MAIL_GMAIL_APP_PASSWORD: 'app-password',
    });
    const service = new MailService(config);

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
    const service = new MailService(config);

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

  it('skips delivery when mail is disabled', async () => {
    const config = new ConfigService({
      NODE_ENV: 'test',
      MAIL_ENABLED: '0',
    });
    const service = new MailService(config);

    await service.send({
      to: 'user@example.com',
      subject: 'subject',
      text: 'text',
      html: '<p>text</p>',
    });

    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });
});
