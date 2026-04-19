import { ApiProperty } from '@nestjs/swagger';

/**
 * OpenAPI 上のエラー共通形（最小）。
 * 実行時の JSON には `errorCode` / `path` / `timestamp` などが付くが、型・契約としてはステータスとメッセージのみを共有する。
 */
export class ErrorResponseDto {
  @ApiProperty({
    example: 401,
    description: 'HTTP ステータス（レスポンスのステータスラインと一致）',
  })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Invalid email or password',
    description:
      'ユーザー向けメッセージ（バリデーション時は文字列の配列になり得る）',
  })
  message!: string | string[];
}
