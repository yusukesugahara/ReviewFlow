import { ConfigService } from '@nestjs/config';
import { MailMessageFactory } from './mail-message.factory';

describe('MailMessageFactory', () => {
  it('builds an application returned email with correction details', () => {
    const factory = new MailMessageFactory(
      new ConfigService({
        FRONTEND_BASE_URL: 'https://review.example.com',
      }),
    );

    const message = factory.buildApplicationReturnedEmail({
      to: 'applicant@example.com',
      applicationId: 'app-1',
      accessToken: 'return-token',
      groupId: 'group-1',
      templateName: '経費申請',
      overallComment: '内容を確認してください',
      fields: [{ label: '備考', comment: '詳細を追記してください' }],
    });

    expect(message.to).toBe('applicant@example.com');
    expect(message.subject).toBe('ReviewFlow 経費申請 が差し戻されました');
    expect(message.text).toContain('備考: 詳細を追記してください');
    expect(message.text).toContain(
      'https://review.example.com/apply/access?token=return-token&next=%2Fapply%2Fcorrection',
    );
    expect(message.html).toContain('修正画面を開く');
  });

  it('escapes HTML in invitation messages', () => {
    const factory = new MailMessageFactory(new ConfigService({}));

    const message = factory.buildInvitationEmail({
      to: 'user@example.com',
      invitedByEmail: 'admin+<x>@example.com',
      acceptToken: 'token',
      expiresAtIso: '2026-01-01T00:00:00.000Z',
      role: 'tenant_user',
    });

    expect(message.html).toContain('admin+&lt;x&gt;@example.com');
    expect(message.html).not.toContain('admin+<x>@example.com');
  });

  it('builds application access URLs from configured frontend base URL', () => {
    const factory = new MailMessageFactory(
      new ConfigService({
        FRONTEND_BASE_URL: 'https://review.example.com/',
      }),
    );

    expect(factory.buildApplicationAccessUrl('access-token')).toBe(
      'https://review.example.com/apply/access?token=access-token',
    );
  });

  it('builds email change confirmation email', () => {
    const factory = new MailMessageFactory(
      new ConfigService({
        FRONTEND_BASE_URL: 'https://review.example.com',
      }),
    );

    const message = factory.buildEmailChangeConfirmationEmail({
      to: 'new@example.com',
      currentEmail: 'old@example.com',
      newEmail: 'new@example.com',
      confirmToken: 'email-change-token',
      expiresAtIso: '2026-01-01T00:00:00.000Z',
    });

    expect(message.to).toBe('new@example.com');
    expect(message.subject).toBe('ReviewFlow メールアドレス変更の確認');
    expect(message.text).toContain('現在のメールアドレス: old@example.com');
    expect(message.text).toContain('新しいメールアドレス: new@example.com');
    expect(message.text).toContain(
      'https://review.example.com/account/email-change/confirm?token=email-change-token',
    );
    expect(message.html).toContain('メールアドレス変更を確認する');
  });
});
