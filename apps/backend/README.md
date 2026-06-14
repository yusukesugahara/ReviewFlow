# Backend（NestJS）

モノレポ内の API サーバーです。内部向け **X-API-Key**、ユーザ向け **JWT**（Passport）、**TypeORM**（**PostgreSQL**）、開発時 **Swagger**、**@nestjs/terminus** による readiness を備えています。

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
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | `DATABASE_URL` を使わない場合の PostgreSQL 接続情報（`DB_PORT` 省略時は `5432`） |
| `DB_SSL` | `true` のとき PostgreSQL 接続に SSL を有効化（マネージド DB 向け） |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` のとき SSL でもサーバー証明書の検証を緩める（自己署名検証用。省略時は検証する） |
| `DB_SYNCHRONIZE` | `false` のときスキーマ自動同期をオフにしマイグレーションを実行（本番は `NODE_ENV=production` で常にこの挙動。ローカルでマイグレーション動作を試すときにも指定可） |
| `SEED_DEMO_ON_DEPLOY` | `true` または `1` のとき、同一デプロイIDにつき1回だけビルド済みのデモ seed を投入する。デモ環境向け。 |
| `DEMO_SEED_DEPLOY_KEY` | `SEED_DEMO_ON_DEPLOY` のデプロイIDを明示する場合に設定。未設定時は `RENDER_GIT_COMMIT` / `VERCEL_GIT_COMMIT_SHA` / `RAILWAY_GIT_COMMIT_SHA` などを利用する。 |
| `SEED_DEMO_ON_START` | `true` または `1` のとき、Docker 本番起動前に毎回ビルド済みのデモ seed を投入する。デモ環境向けの旧設定。 |
| `THROTTLE_TTL_MS` | グローバルレート制限の窓幅（ミリ秒）。省略時 `60000` |
| `THROTTLE_LIMIT` | 本番（`NODE_ENV=production`）での上記窓あたりの最大リクエスト数（IP 単位）。省略時 `120` |
| `THROTTLE_LIMIT_DEV` | 非本番のグローバル上限（省略時 `2000`）。`/auth/register`・`/auth/login` は別途 60 秒あたり 20 回まで |
| `TRUST_PROXY` | `1` のとき Express の `trust proxy` を有効化（Ingress / LB 越しのクライアント IP を Throttler 等が扱えるようにする） |
| `JSON_BODY_LIMIT` | `express.json` / `urlencoded` の最大サイズ（省略時 `256kb`） |
| `CORS_ORIGIN` | ブラウザから API を呼ぶ場合の許可オリジン（例: `http://localhost:3001`）。未設定時の挙動は利用するクライアントに合わせて確認すること |

本番起動時（`main.ts`）は **`JWT_SECRET` が 32 文字未満**、または **`INTERNAL_API_KEY` が 16 文字未満**の場合、起動直後にエラーで終了します。さらに PostgreSQL 接続用に **`DATABASE_URL`、または `DB_HOST` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` のすべて**が必要です。

## ヘルスチェック（Terminus）

| パス | 用途 |
|------|------|
| `GET /health` | **Liveness**（プロセス生存のみ。DB にアクセスしない）。Dockerfile の `HEALTHCHECK` はここを参照。 |
| `GET /ready` | **Readiness**（TypeORM で DB に `ping`）。Kubernetes の `readinessProbe` 向け。 |

いずれも **API Key / JWT / レート制限の対象外**です（Swagger には載せません）。

## Docker Compose と PostgreSQL

リポジトリ直下の `docker-compose.yml` で **PostgreSQL**、backend、frontend を起動できます。

```bash
docker compose up
```

`backend` サービスは `DB_HOST=postgres`、`DB_PORT=5432`、`DB_USERNAME=app`、`DB_PASSWORD=app`、`DB_NAME=app_dev` で PostgreSQL に接続します。

`NODE_ENV=production` のときは **`synchronize` を使わず**、起動時に `src/migrations`（ビルド後は `dist/migrations`）の未実行マイグレーションだけが走ります。本番用 DB はマイグレーション履歴と整合する状態で運用してください。

## デモ seed データ

ローカル確認用に、申請フォーム・承認フロー・申請一覧の各ステータスを含むデモデータを投入できます。

```bash
# リポジトリ直下で実行
npm run seed:demo -w backend
```

既定では Docker Compose の PostgreSQL（`127.0.0.1:5432` / `app_dev`）へ投入します。実行前に既存テーブルを `TRUNCATE ... RESTART IDENTITY CASCADE` で初期化し、現在の実装に合うデモデータを作り直します。

投入先 DB を変える場合は、backend 起動時と同じ PostgreSQL 環境変数を付けて実行してください。

```bash
# 例: Docker Compose の backend と同じ DB を使う場合
docker compose exec backend npm run seed:demo -w backend

# 例: ホストから PostgreSQL に投入する場合
DB_HOST=localhost \
DB_PORT=5432 \
DB_USERNAME=app \
DB_PASSWORD=app \
DB_NAME=app_dev \
npm run seed:demo -w backend
```

既存データを全削除せず、既存の `みどり市 申請受付デモ` / `ReviewFlow Demo` テナントだけを置き換えたい場合は `SEED_RESET_DATABASE=false` を付けて実行してください。

本番起動スクリプトでは、デプロイ環境変数 `SEED_DEMO_ON_DEPLOY=true` を設定すると、同一デプロイIDにつき1回だけアプリ起動前に `dist/scripts/seed-demo.js` を実行します。デモ環境や検証環境だけで有効化してください。実行済みデプロイIDは DB の `demo_seed_deployments` テーブルに記録されます。

```bash
SEED_DEMO_ON_DEPLOY=true npm run start:prod -w backend
```

Render では `RENDER_GIT_COMMIT` を自動利用します。同じ commit の手動再デプロイでも必ずリセットしたい場合は、デプロイごとに変わる値を `DEMO_SEED_DEPLOY_KEY` に設定してください。`SEED_DEMO_ON_START=true` は起動のたびにリセットするため、スリープ復帰や手動再起動でもデータが初期化されます。

Render の Start Command では `npm run start:prod -w backend` または `node apps/backend/scripts/start-prod.cjs` を使ってください。`node apps/backend/dist/main.js` を直接実行すると seed は通りません。

投入後は次のアカウントでログインできます。パスワードはいずれも `Password123!` です。

| メールアドレス | 用途 |
|------|------|
| `admin@reviewflow.demo` | テナント管理者・フォーム作成者 |
| `citizen-reviewer@reviewflow.demo` | 市民課 窓口担当 |
| `citizen-approver@reviewflow.demo` | 市民課 係長 |
| `citizen-operator@reviewflow.demo` | 市民課 窓口担当 |
| `road-reviewer@reviewflow.demo` | 道路公園課 担当者 |
| `road-approver@reviewflow.demo` | 道路公園課 課長 |
| `road-inspector@reviewflow.demo` | 道路公園課 現地確認担当 |

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

# デモ seed データ投入
npm run seed:demo -w backend
```

統合テスト・E2E テストは PostgreSQL が必要です。ローカルでは `docker compose up postgres -d` の後に実行してください。テストは既定で `app_test` DB を自動作成し、DB 名に `test` を含まない接続先は schema reset を拒否します。

## 認証の考え方

1. **ほぼすべての HTTP API**（OPTIONS 除く）に **`X-API-Key: <INTERNAL_API_KEY>`** が必要です。**例外:** **`GET /health`** と **`GET /ready`**（ロードバランサ・Kubernetes 用。API Key / JWT / レート制限の対象外。Swagger には出しません）。
2. **`/auth/register`・`/auth/login`** は API Key のみ（JWT 不要）。
3. それ以外の保護ルートは **`Authorization: Bearer <access_token>`** も必要です。
4. 先頭に登録したユーザは **`admin`** ロール、2 人目以降は **`user`**。`/auth/admin/ping` は `admin` のみ。

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
