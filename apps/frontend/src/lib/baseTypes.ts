export type ActionResponse<T> = {
  data?: T;
  error?: {
    message: string;
  };
};

export type FormActionResponse<T> = ActionResponse<T> & {
  fieldErrors?: Record<string, string[] | undefined>;
};