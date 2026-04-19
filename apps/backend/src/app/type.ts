export type SuccessResponse<T> = {
  status: 200;
  data: T;
};

export type ErrorResponse = {
  status: number;
  message: string;
  code?: string;
};
