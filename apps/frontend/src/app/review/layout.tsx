import type { ReactNode } from "react";
import Link from "next/link";

type ReviewLayoutProps = {
  children: ReactNode;
};

export default function ReviewLayout({ children }: ReviewLayoutProps) {
  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>承認レビュー</h1>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link href="/review/applications">レビュー待ち申請</Link>
      </nav>
      {children}
    </main>
  );
}
