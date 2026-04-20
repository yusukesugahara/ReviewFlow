import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogoutForm } from './logout/logout-form';
import { getCurrentSessionUser } from '@/lib/server/session';

export const metadata: Metadata = {
  title: 'Frontend App',
  description: 'Next.js frontend application',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const mePromise = getCurrentSessionUser();
  return (
    <html lang="ja">
      <body>
        <header
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '0.5rem 1rem',
            borderBottom: '1px solid #eee',
          }}
        >
          <HeaderUser mePromise={mePromise} />
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
    return <Link href="/login">ログイン</Link>;
  }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span>{me.email}</span>
      <LogoutForm />
    </div>
  );
}
