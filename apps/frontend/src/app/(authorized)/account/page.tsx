import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/app/(authorized)/session/actions";
import type { AccountPageProps } from "./types";
import { AccountView } from "./view";

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = (await searchParams) ?? {};
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AccountView
      user={user}
      emailError={params.emailError}
      passwordError={params.passwordError}
      profileError={params.profileError}
    />
  );
}
