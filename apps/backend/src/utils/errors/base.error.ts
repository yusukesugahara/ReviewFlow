import { HttpStatus } from '@nestjs/common';

/**
 * アプリ全体で共有する業務・インフラエラーの基底クラス。
 * `instanceof BaseError` でグローバルフィルタが識別する。
 */
export class BaseError extends Error {
  /** HTTP ステータス（例: 404） */
  readonly statusCode: number;

  /** 機械可読なコード（例: USER_NOT_FOUND）。ログ・フロントの分岐に使う */
  readonly errorCode: string;

  constructor(
    statusCode: HttpStatus | number,
    errorCode: string,
    message: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}
