import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LogoutForm } from './logout/logout-form';

export const metadata: Metadata = {
  title: 'Frontend App',
  description: 'Next.js frontend application',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
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
          <LogoutForm />
        </header>
        {children}
      </body>
    </html>
  );
}
