import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";

export type AccountPageProps = {
  searchParams?: Promise<{
    passwordError?: string;
    profileError?: string;
  }>;
};

export type AccountViewProps = {
  passwordError?: string;
  profileError?: string;
  user: CurrentSessionUser;
};
