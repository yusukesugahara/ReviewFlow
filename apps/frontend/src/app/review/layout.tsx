import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type ReviewLayoutProps = {
  children: ReactNode;
};

export default function ReviewLayout({ children }: ReviewLayoutProps) {
  return children;
}
