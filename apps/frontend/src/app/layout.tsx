import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogoutForm } from './logout/logout-form';
import { getCurrentSessionUser } from '@/lib/server/session';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'ReviewFlow',
  description: '申請承認フローシステム',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const mePromise = getCurrentSessionUser();
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold">ReviewFlow</span>
            </Link>
            <HeaderUser mePromise={mePromise} />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}

async function HeaderUser({
  mePromise,
}: {
  mePromise: ReturnType<typeof getCurrentSessionUser>;
}) {
  const me = await mePromise;
  if (!me) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">ログイン</Link>
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground">{me.email}</span>
      <LogoutForm />
    </div>
  );
}
