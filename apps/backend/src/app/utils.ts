/**
 * 成功レスポンスを API 共通の envelope 形式へ包む。
 *
 * controller は DTO 生成と HTTP mapping に集中し、レスポンス形状はこの helper に
 * 揃える。
 */
export function successResponse<T>(dto: T): { status: 200; data: T } {
  return {
    status: 200,
    data: dto,
  };
}
