import type { ReactNode } from "react";
import Link from "next/link";

type ApplicantLayoutProps = {
  children: ReactNode;
};

export default function ApplicantLayout({ children }: ApplicantLayoutProps) {
  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>申請ポータル</h1>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link href="/app/applications">申請一覧</Link>
      </nav>
      {children}
    </main>
  );
}
