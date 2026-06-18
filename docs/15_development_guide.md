# 開発ガイド

ReviewFlow のローカル開発・テスト・型生成の手順をまとめる。環境変数の詳細は [バックエンド README](../apps/backend/README.md) も参照すること。

## 前提

- Node.js LTS（CI では 22.x）
- npm
- Docker / Docker Compose（コンテナ起動時）

リポジトリは npm workspaces を使用する。依存関係のインストールと lockfile 更新は **ルート** で行う。

```bash
npm install
```

## 環境変数の準備

```bash
cp apps/backend/.env.example apps/backend/.env.dev
cp apps/frontend/.env.example apps/frontend/.env
```

ローカル開発の既定値:

| 項目 | 値 |
| --- | --- |
| バックエンド API | `http://127.0.0.1:3000` |
| フロントエンド | `http://127.0.0.1:3001` |
| `INTERNAL_API_KEY` | バックエンド・フロントエンドで同一値 |

主要な環境変数:

| アプリ | 変数 | 用途 |
| --- | --- | --- |
| backend | `INTERNAL_API_KEY` | サーバー間 API キー（必須） |
| backend | `JWT_SECRET` | JWT 署名（32 文字以上推奨） |
| backend | `DATABASE_URL` または `DB_HOST` 等 | PostgreSQL 接続 |
| backend | `MAIL_ENABLED` | `0` でメール送信スキップ |
| backend | `FRONTEND_BASE_URL` | 招待・申請案内メールの URL 生成 |
| frontend | `NEXT_PUBLIC_API_URL` | ブラウザから参照する API 起点 |
| frontend | `INTERNAL_API_KEY` | Next.js サーバーからの API 呼び出し用 |
| frontend | `INTERNAL_API_ORIGIN` | Docker 内からバックエンドへ接続する場合 |

`.env`、`.env.dev`、`.env.local`、実際の API キー、メール認証情報はコミットしない。

## ローカル起動

### Docker Compose（推奨）

PostgreSQL + バックエンド + フロントエンドを一括起動する。

```bash
docker compose up --build
```

- バックエンド: `http://localhost:3002`（`BACKEND_HOST_PORT` で変更可）
- フロントエンド: `http://localhost:3001`
- PostgreSQL: `localhost:5432`（ユーザー/パスワード/DB: `app` / `app` / `app_dev`）

### 個別起動

```bash
# PostgreSQL のみ
docker compose up postgres -d

# バックエンド
npm run dev:backend

# フロントエンド
npm run dev:frontend
```

バックエンド単体起動時は `.env.dev` に PostgreSQL 接続情報を設定する。

### デモデータの入れ直し

ローカル確認用のデモデータは次のコマンドで投入する。既定では Docker Compose の PostgreSQL（`app_dev`）に接続し、既存テーブルを全削除してから現在の実装に合うシード値を入れ直す。

```bash
docker compose up postgres -d
npm run seed:demo -w backend
```

既存データを全削除せず、デモテナントだけ置き換える場合は `SEED_RESET_DATABASE=false` を付ける。

## テスト

### バックエンド

統合テスト・E2E テストは **PostgreSQL** が必要。

```bash
docker compose up postgres -d
npm run test -w backend
```

- ユニットテストと統合テストは Jest projects で分離している
- 統合テスト・E2E テストは既定で `app_test` を自動作成し、各テスト前に schema を作り直す
- 別 DB を使う場合は、DB 名に `test` を含む `TEST_DATABASE_URL` を指定する
- 統合テストと E2E テストは DB 競合防止のため直列実行する

```bash
# バックエンド E2E
npm run test:e2e -w backend
```

### フロントエンド

```bash
npm run test -w frontend
npm run test:e2e -w frontend
```

Playwright E2E はビルド済みフロントエンドの起動を前提とする。現状は認証クッキー検証など最小構成。

### CI

GitHub Actions（`.github/workflows/ci.yml`）では PostgreSQL サービスと `TEST_DATABASE_URL` を設定し、`npm run check` を実行する。

## ルートコマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | Docker Compose フルスタック起動 |
| `npm run dev:frontend` | フロントエンドのみ |
| `npm run dev:backend` | バックエンドのみ |
| `npm run lint` | フロント・バックエンド lint |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run test` | バックエンドテスト |
| `npm run build` | 本番ビルド |
| `npm run check` | lint + typecheck + test + build |

## API 契約更新

フロントエンドの backend 呼び出しは Relay runtime 経由の GraphQL operation として管理する。API 契約を変える場合は、以下を合わせて更新する。

- GraphQL resolver / GraphQL object type / input type
- フロントエンドの Relay operation: `apps/frontend/src/lib/relay/`
- フロントエンド共有 DTO 型: `apps/frontend/src/lib/schema.ts`

REST 参照スキーマを変える場合のみ、OpenAPI schema を更新する。

```bash
npm run openapi:emit
npm run typecheck
```

- REST 参照スキーマ: `apps/backend/schema.json`
- Relay client: `apps/frontend/src/lib/relay/client.ts`

## マイグレーション

本番（`NODE_ENV=production`）では `synchronize` を使わず、起動時に未実行マイグレーションのみ適用する。マイグレーション定義は `apps/backend/src/migrations/` にある。

## トラブルシューティング

### `apps/backend/dist` の権限エラー

Docker 実行で `dist` が root 所有になることがある。

```bash
docker run --rm -v "$(pwd):/workspace" alpine chown -R "$(id -u):$(id -g)" /workspace/apps/backend/dist
```

### Git オブジェクト破損

`.git/objects` が空ファイルになると `git log` が失敗する。reflog から最後の正常コミットへ `git update-ref` で戻す。

## 関連ドキュメント

- [概要](00_overview.md)
- [API 仕様](04_api_spec.md)
- [全体構成](05_architecture.md)
- [認証とマルチテナント](08_auth_and_multitenant.md)
- [コーディングルール](11_coding_rules.md)
- [ルート README](../README.md)
