# Backend（NestJS）

モノレポ内の API サーバーです。内部向け **X-API-Key**、ユーザー向け **JWT**（Passport）、**TypeORM**（**PostgreSQL**）、開発時 **Swagger**、**@nestjs/terminus** による readiness を備えています。

## 前提

- Node.js（プロジェクト方針に合わせた LTS 推奨）
- Yarn（または `npm` で同等のコマンドを実行）

## セットアップ

```bash
cd apps/backend
yarn install
cp .env.example .env.dev
# .env.dev の JWT_SECRET などを本番相当にしない値に変更する
```

非本番では `AppModule` が **`.env` のあと `.env.dev`** を読み込みます（`NODE_ENV=production` のときは `.env` のみ）。

## 環境変数

| 変数 | 説明 |
|------|------|
| `NODE_ENV` | `development` で Swagger（`/docs`）を有効化。`production` では TypeORM の `synchronize` をオフにし、起動時に保留中のマイグレーションを実行する |
| `PORT` | 待ち受けポート（省略時 `3000`） |
| `INTERNAL_API_KEY` | サーバー間通信用（例: Next のサーバーから `X-API-Key` ヘッダで送信） |
| `JWT_SECRET` | アクセストークン署名・検証用（十分に長いランダム文字列） |
| `JWT_EXPIRES_IN` | JWT 有効期限（例: `7d`） |
| `DATABASE_URL` | PostgreSQL の接続 URL（例: `postgres://user:pass@host:5432/dbname`）。設定時は `DB_HOST` 等は不要 |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | `DATABASE_URL` を使わない場合のPostgreSQL接続情報（`DB_PORT` 省略時は `5432`） |
| `DB_SSL` | `true` のとき DB 接続に SSL を有効化（マネージド DB 向け） |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` のとき SSL でもサーバー証明書の検証を緩める（自己署名検証用。省略時は検証する） |
| `DB_SYNCHRONIZE` | `false` のときスキーマ自動同期をオフにしマイグレーションを実行（本番は `NODE_ENV=production` で常にこの挙動。ローカルでマイグレーション動作を試すときにも指定可） |
| `THROTTLE_TTL_MS` | グローバルレート制限の窓幅（ミリ秒）。省略時 `60000` |
| `THROTTLE_LIMIT` | 本番（`NODE_ENV=production`）での上記窓あたりの最大リクエスト数（IP 単位）。省略時 `120` |
| `THROTTLE_LIMIT_DEV` | 非本番のグローバル上限（省略時 `2000`）。`/auth/register`・`/auth/login` は別途 60 秒あたり 20 回まで |
| `TRUST_PROXY` | `1` のとき Express の `trust proxy` を有効化（Ingress / LB 越しのクライアント IP を Throttler 等が扱えるようにする） |
| `JSON_BODY_LIMIT` | `express.json` / `urlencoded` の最大サイズ（省略時 `256kb`） |
| `CORS_ORIGIN` | ブラウザから API を呼ぶ場合の許可オリジン（例: `http://localhost:3001`）。未設定時の挙動は利用するクライアントに合わせて確認すること |

本番起動時（`main.ts`）は **`JWT_SECRET` が 32 文字未満**、または **`INTERNAL_API_KEY` が 16 文字未満**の場合、起動直後にエラーで終了します。さらに **`DATABASE_URL`、または `DB_HOST` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` のすべて**が必要です。

## ヘルスチェック（Terminus）

| パス | 用途 |
|------|------|
| `GET /health` | **Liveness**（プロセス生存のみ。DB にアクセスしない）。Dockerfile の `HEALTHCHECK` はここを参照。 |
| `GET /ready` | **Readiness**（TypeORM で DB に `ping`）。Kubernetes の `readinessProbe` 向け。 |

いずれも **API Key / JWT / レート制限の対象外**です（Swagger には載せません）。

## Docker Compose と PostgreSQL

リポジトリ直下の `docker-compose.yml` は **PostgreSQL** を起動し、`backend` は既定でその PostgreSQL に接続します。

```bash
docker compose up
```

`backend` サービスには `DB_HOST=postgres`、`DB_PORT=5432`、`DB_USERNAME=app`、`DB_PASSWORD=app`、`DB_NAME=app` を設定しています。

`NODE_ENV=production` のときは **`synchronize` を使わず**、起動時に `src/migrations`（ビルド後は `dist/migrations`）の未実行マイグレーションだけが走ります。本番用 DB は空から起動するか、マイグレーション履歴と整合する状態にしてください。

## よく使うコマンド

```bash
# 開発（ウォッチ）— apps/backend で実行
yarn start:dev

# Lint 通過後にビルド（CI 向け）
yarn compile

# 本番ビルド（postbuild で dist/main.js も生成）
yarn build

# 本番起動（先に yarn build）
yarn start:prod

# E2E
yarn test:e2e

# Lint（自動修正）
yarn lint

# Lint のみ（修正しない）
yarn lint:check
```

## 認証の考え方

1. **ほぼすべての HTTP API**（OPTIONS 除く）に **`X-API-Key: <INTERNAL_API_KEY>`** が必要です。**例外:** **`GET /health`** と **`GET /ready`**（ロードバランサ・Kubernetes 用。API Key / JWT / レート制限の対象外。Swagger には出しません）。
2. **`/auth/register`・`/auth/login`** は API Key のみ（JWT 不要）。
3. それ以外の保護ルートは **`Authorization: Bearer <access_token>`** も必要です。
4. 先頭に登録したユーザーは **`admin`** ロール、2 人目以降は **`user`**。`/auth/admin/ping` は `admin` のみ。

## 成功レスポンスの形

コントローラは `successResponse()` でラップしており、成功時は概ね次の形です。

```json
{
  "status": 200,
  "data": { }
}
```

`POST /auth/register` の HTTP ステータスは **201** です。

## エラーレスポンス

グローバル例外フィルタが JSON を返します。

```json
{
  "statusCode": 400,
  "errorCode": "AUTH_JWT_UNAUTHORIZED",
  "message": "…",
  "path": "/auth/me",
  "timestamp": "…"
}
```

業務エラーは `clientError` / `serverError` / `internalError`（いずれも `BaseError`）、素の `Error` は機械可読 `errorCode` 付きで 500 系に正規化されます（`src/utils/errors` と `src/common/errors`）。

## Swagger（開発時）

`NODE_ENV=development` のとき **http://localhost:3000/docs**（`PORT` に合わせて読み替え）で OpenAPI UI が利用できます。本番では既定で無効です。

例外はコントローラーで `@ApiResponse` せず、`GlobalExceptionFilter` が `throw new Error()` / `BaseError` / `HttpException` を JSON にまとめる。OpenAPI の **`components.schemas.ErrorResponseDto`**（`statusCode` / `message` のみ）は参照用として `schema.json` に載る。更新は **`npm run openapi:emit`**（または開発起動時の `writeFileSync`）。

## セキュリティ関連（bootstrap）

- **Helmet** … 主要な HTTP ヘッダを強化
- **CORS** … `CORS_ORIGIN` と許可メソッド・ヘッダで制御

## ソースの目安

| パス | 内容 |
|------|------|
| `src/app/main.ts` | 起動・Helmet・CORS・パイプ・Swagger |
| `src/app/app.module.ts` | Config・DB・モジュール集約 |
| `src/app/modules/` | 機能モジュール（`auth`, `users`） |
| `src/app/guards/` | API Key / JWT / Roles |
| `src/strategies/` | JWT Strategy |
| `src/common/` | 定数・DTO・フィルタ・エラーカタログ |
| `src/decorators/` | `@CurrentUser`, `@Roles` など |
| `src/models/` | TypeORM エンティティ |
| `src/test/` | E2E（Jest） |

エントリは `src/app/main.ts`。ビルド後の実行ファイルは **`dist/app/main.js`** に加え、互換用に **`dist/main.js`**（`app/main` を require）も `postbuild` で生成されます。

## ライセンス

`package.json` の `license` フィールドに従います（このテンプレートでは `UNLICENSED`）。
