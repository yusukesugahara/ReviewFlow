import { LoginView } from "./view";
import { fetchApiOriginReachable } from "@/lib/server/fetch-api-origin-reachable";

type PageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const apiReachable = await fetchApiOriginReachable();
  const params = (await searchParams) ?? {};
  return <LoginView apiReachable={apiReachable} next={params.next} />;
}
