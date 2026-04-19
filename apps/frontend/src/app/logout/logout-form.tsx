import { logout } from "./actions";

export function LogoutForm() {
  return (
    <form action={logout}>
      <button type="submit">ログアウト</button>
    </form>
  );
}
