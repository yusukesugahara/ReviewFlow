export function successResponse<T>(dto: T): { status: 200; data: T } {
  return {
    status: 200,
    data: dto,
  };
}
