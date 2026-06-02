'use client';

import { logout } from './actions';
import { Button } from '@/components/ui/button';

export function LogoutForm() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline" size="sm">
        ログアウト
      </Button>
    </form>
  );
}
