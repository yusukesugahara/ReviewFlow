import './globals.css';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { QueryToast } from './_components/query-toast';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'ReviewFlow',
  description: '申請承認フローシステム',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Suspense fallback={null}>
          <QueryToast />
        </Suspense>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
