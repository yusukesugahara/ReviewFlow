# フロント E2E（Playwright）

## 手動確認（DevTools）

1. バックエンド（`INTERNAL_API_KEY` と一致するキー）とフロント（`.env.local` に `NEXT_PUBLIC_API_URL` と `INTERNAL_API_KEY`）を起動する。
2. ブラウザで `/login` にアクセスし、ログインする。
3. **開発者ツール → Application → Cookies** で、対象オリジンに `access_token` があり **HttpOnly** が付いていることを確認する。
4. **Console** で `document.cookie` を実行し、`access_token` が**含まれない**ことを確認する（HttpOnly は JS から読めない）。

## Playwright

バックエンドを別ターミナルで起動したうえで（デフォルト `http://127.0.0.1:3000`、キーは `dev-internal-key-change-me` とバックエンドの `INTERNAL_API_KEY` を一致させる）:

```bash
cd apps/frontend
npx playwright install chromium   # 初回のみ
E2E_API_URL=http://127.0.0.1:3000 npm run test:e2e
```

`playwright.config` の webServer は **`npm run build` → `next start --port 3001`** です（Server Action が参照する `INTERNAL_API_KEY` / `NEXT_PUBLIC_API_URL` をビルド・起動の両方で確実に渡すため）。既に Next を手動で 3001 で動かしている場合:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 E2E_API_URL=http://127.0.0.1:3000 npm run test:e2e
```

`E2E_INTERNAL_API_KEY` で API キーを上書きできる。公開申請系の E2E は applicant access token を発行するため、Docker 既定値以外の `JWT_SECRET` でバックエンドを起動している場合は `E2E_JWT_SECRET` も同じ値にする。
