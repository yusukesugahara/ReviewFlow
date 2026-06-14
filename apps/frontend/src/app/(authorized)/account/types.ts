import type { CurrentSessionUser } from "@/app/(authorized)/session/actions";

export type AccountPageProps = {
  searchParams?: Promise<{
    emailError?: string;
    passwordError?: string;
    profileError?: string;
  }>;
};

export type AccountViewProps = {
  emailError?: string;
  passwordError?: string;
  profileError?: string;
  user: CurrentSessionUser;
};
