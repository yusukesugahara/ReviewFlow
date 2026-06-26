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

export type ApplicationSubmittedMailInput = {
  to: string;
  applicationId: string;
  accessToken: string;
  templateName: string;
};

export type PasswordResetMailInput = {
  to: string;
  resetToken: string;
  expiresAtIso: string;
};

export type EmailChangeConfirmationMailInput = {
  to: string;
  currentEmail: string;
  newEmail: string;
  confirmToken: string;
  expiresAtIso: string;
};

/**
 * ReviewFlow から送るメールの件名・本文・HTML を組み立てる factory。
 */
@Injectable()
export class MailMessageFactory {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 招待メールを組み立てる。
   * @param input 招待メール入力
   * @returns メール送信入力
   */
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

  /**
   * 公開申請アクセスメールを組み立てる。
   * @param input 公開申請アクセスメール入力
   * @returns メール送信入力
   */
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

  /**
   * 差し戻し通知メールを組み立てる。
   * @param input 差し戻し通知メール入力
   * @returns メール送信入力
   */
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

  /**
   * 申請受付通知メールを組み立てる。
   * @param input 申請受付通知メール入力
   * @returns メール送信入力
   */
  buildApplicationSubmittedEmail(
    input: ApplicationSubmittedMailInput,
  ): SendMailInput {
    const detailUrl = this.buildFrontendUrl('/apply/access', {
      token: input.accessToken,
      next: '/apply/submission',
    });

    return {
      to: input.to,
      subject: `ReviewFlow ${input.templateName} の申請を受け付けました`,
      text: [
        `${input.templateName} の申請を受け付けました。`,
        '以下のURLから申請内容を確認できます。',
        `申請内容URL: ${detailUrl}`,
      ].join('\n'),
      html: [
        `<p>${this.escapeHtml(input.templateName)} の申請を受け付けました。</p>`,
        '<p>以下のURLから申請内容を確認できます。</p>',
        `<p><a href="${this.escapeHtml(detailUrl)}">申請内容を確認する</a></p>`,
      ].join(''),
    };
  }

  /**
   * パスワード再設定メールを組み立てる。
   * @param input パスワード再設定メール入力
   * @returns メール送信入力
   */
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

  /**
   * メールアドレス変更確認メールを組み立てる。
   * @param input メールアドレス変更確認メール入力
   * @returns メール送信入力
   */
  buildEmailChangeConfirmationEmail(
    input: EmailChangeConfirmationMailInput,
  ): SendMailInput {
    const confirmUrl = this.buildFrontendUrl('/account/email-change/confirm', {
      token: input.confirmToken,
    });

    return {
      to: input.to,
      subject: 'ReviewFlow メールアドレス変更の確認',
      text: [
        'ReviewFlow のメールアドレス変更リクエストを受け付けました。',
        `現在のメールアドレス: ${input.currentEmail}`,
        `新しいメールアドレス: ${input.newEmail}`,
        `確認URL: ${confirmUrl}`,
        `有効期限: ${input.expiresAtIso}`,
        '心当たりがない場合は、このメールを破棄してください。',
      ].join('\n'),
      html: [
        '<p>ReviewFlow のメールアドレス変更リクエストを受け付けました。</p>',
        `<p>現在のメールアドレス: ${this.escapeHtml(input.currentEmail)}</p>`,
        `<p>新しいメールアドレス: ${this.escapeHtml(input.newEmail)}</p>`,
        `<p><a href="${this.escapeHtml(confirmUrl)}">メールアドレス変更を確認する</a></p>`,
        `<p>有効期限: ${this.escapeHtml(input.expiresAtIso)}</p>`,
        '<p>心当たりがない場合は、このメールを破棄してください。</p>',
      ].join(''),
    };
  }

  /**
   * 公開申請アクセスURLを組み立てる。
   * @param accessToken 申請者アクセストークン
   * @returns 公開申請アクセスURL
   */
  buildApplicationAccessUrl(accessToken: string): string {
    return this.buildFrontendUrl('/apply/access', {
      token: accessToken,
    });
  }

  /**
   * frontend の絶対URLを組み立てる。
   * @param path パス
   * @param params クエリパラメータ
   * @returns frontend URL
   */
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

  /**
   * HTML メール本文に埋め込む文字列をエスケープする。
   * @param value 入力値
   * @returns HTML エスケープ済み文字列
   */
  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
