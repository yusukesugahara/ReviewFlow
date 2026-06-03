export type LoginPageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export type LoginViewProps = {
  apiReachable: boolean;
  next?: string;
};
