import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toQueryString(params: Record<string, string | string[] | undefined>) {
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => nextParams.append(key, item));
    } else if (value) {
      nextParams.set(key, value);
    }
  }
  return nextParams.toString();
}

export default async function AdminApplicationsRedirectPage({
  searchParams,
}: PageProps) {
  const query = toQueryString((await searchParams) ?? {});
  redirect(`/space/applications${query ? `?${query}` : ""}`);
}
