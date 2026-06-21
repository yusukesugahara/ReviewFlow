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

### Storybook

汎用UIと申請ワークフロー固有UIの確認には Storybook を使う。

```bash
npm run storybook -w frontend
npm run storybook:build -w frontend
```

stories は `apps/frontend/src/stories/` に置く。グローバルCSSは `.storybook/preview.ts` から読み込む。

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
| `npm run test` | バックエンドテスト + フロントエンド Jest |
| `npm run build` | 本番ビルド |
| `npm run check` | lint + Relay validate + typecheck + test + build |

## API 契約更新

フロントエンドの backend 呼び出しは Relay runtime 経由の GraphQL operation として管理する。API 契約を変える場合は、以下を合わせて更新する。

- GraphQL resolver / GraphQL object type / input type
- フロントエンドの Relay operation: `apps/frontend/src/lib/relay/`
- フロントエンド共有 DTO 型: `apps/frontend/src/lib/schema.ts`

### GraphQL / Relay と REST の使い分け

認証後 UI の主要な業務画面では、GraphQL / Relay を正の API 契約とする。申請一覧、申請詳細、承認ステップ、差し戻し履歴、コメント、監査ログのように画面単位で必要なデータが変わる領域は、Relay operation / fragment でコンポーネントが必要な field を宣言する。

REST が残っていること自体は問題ではない。ただし、新規追加や利用継続は用途で判断する。

REST を残してよいもの:

- `/health` / `/ready` などの運用 endpoint
- CSV export の作成、状態確認、成果物 download など、ファイルや HTTP response header を扱う API
- 申請者アクセストークンを使う公開申請・差し戻し修正など、認証後 UI と別境界の入口
- 外部クライアント、既存クライアント、Swagger / OpenAPI 検証との互換が必要な API

REST を増やさないもの:

- 認証後 UI の通常画面で使う一覧・詳細・更新
- Relay Connection / Fragment で表現できる画面データ
- GraphQL と同じ業務操作を、別サービスや別バリデーションとして再実装する API

GraphQL と REST が同じ操作を持つ移行期は、Controller / Resolver を薄く保つ。両方とも同じ Service / Use case に委譲し、認可、tenant / group scope、状態遷移、監査ログは backend service 層で一元化する。

新しい認証後 UI を実装するときの判断順:

1. 画面で使うデータ取得・更新は GraphQL / Relay に追加する。
2. 一覧は Connection 形式にし、`first` / `after` を受ける。
3. コンポーネント単位の data dependency は Relay Fragment として宣言する。
4. Mutation は typed input / payload を基本にし、必要なら `clientMutationId` を持たせる。
5. REST が必要な場合は、運用、ファイル、公開入口、外部互換のどれに該当するかを docs / PR に明記する。

### GraphQL / Relay の実行時の流れ

ReviewFlow では、Next.js から NestJS backend への主要な内部 API 呼び出しを GraphQL operation として扱う。申請詳細・申請一覧など、取得項目が画面間で共有されやすい領域は Relay compiler 管理の operation / fragment を使う。

申請一覧を例にすると、流れは以下のようになる。

1. フロントエンドで必要な取得項目を `apps/frontend/src/lib/relay/application-operations.graphql.ts` に Fragment / Query として定義する。
2. `relay-compiler` が GraphQL schema と operation の整合性を検証し、`apps/frontend/src/lib/relay/__generated__/` に artifact を生成する。
3. `apps/frontend/src/lib/relay/application-operations.ts` が generated artifact から operation text を取り出す。
4. `apps/frontend/src/lib/relay/applications.ts` または `apps/frontend/src/lib/relay/client.ts` が `executeRelayOperation()` を呼び、Relay runtime の server-side Environment / Network 経由で backend の `/graphql` に POST する。
5. backend の GraphQL resolver が JWT / role guard を通したうえで、GraphQL loader に処理を渡す。
6. loader は actor 情報を含めて `ApplicationsService` を呼び、service 層で権限・状態・用途に応じた use case を選ぶ。
7. repository 層が TypeORM query を組み立て、tenant / group / actor の条件を付けて DB から取得する。
8. loader が DTO を GraphQL type に変換し、Relay global ID や Connection / PageInfo を付与して返す。
9. フロントエンドは GraphQL response の `data` を受け取り、必要に応じて `databaseId` を画面用の `id` に戻して UI に渡す。

代表的な参照先:

| 役割 | ファイル |
| --- | --- |
| Relay Fragment / Query 定義 | `apps/frontend/src/lib/relay/application-operations.graphql.ts` |
| generated artifact から operation text を取り出す層 | `apps/frontend/src/lib/relay/application-operations.ts` |
| Relay runtime の server-side Environment / Network | `apps/frontend/src/lib/relay/client.ts` |
| 申請向け typed helper | `apps/frontend/src/lib/relay/applications.ts` |
| 申請 GraphQL resolver | `apps/backend/src/app/modules/applications/graphql/applications.graphql.resolver.ts` |
| 申請 GraphQL loader | `apps/backend/src/app/modules/applications/graphql/application.graphql.loader.ts` |
| Relay Node resolver | `apps/backend/src/app/graphql/relay-node.resolver.ts` |
| Relay Connection / PageInfo / cursor helper | `apps/backend/src/common/graphql/relay-pagination.ts` |
| DB level pagination | `apps/backend/src/models/repositories/application-query.repository.ts` |

### Relay Server Specification で扱っていること

backend 側では、Relay の代表的な形として `Node`、global ID、Connection / PageInfo を実装している。

- `Node`: `node(id: ID!)` で Relay global ID から対象データを再取得できる入口を用意する。
- global ID: backend の DB ID をそのまま公開せず、`Application:<uuid>` のような type + id を base64url 化して GraphQL の `id` として返す。
- `databaseId`: 画面や既存処理で DB ID が必要な場面に備え、GraphQL の `id` とは別に DB ID を返す。
- Connection: 一覧は `nodes`、`edges`、`pageInfo`、`totalCount` を持つ Connection 型で返す。
- cursor pagination: `after` cursor を offset に戻し、repository の `skip/take` に変換して DB レベルでページ単位に取得する。

申請一覧では、`ApplicationsQuery` が `applicationsConnection(groupId, first, after)` を呼び出す。backend では `resolveOffsetPagination()` が `first` と `after` を検証し、`ApplicationQueryRepository` が `skip(page.offset).take(page.limit).getManyAndCount()` で取得する。その結果を `connectionFromOffsetPage()` が `pageInfo` と cursor 付きの Connection に整形する。

この構成により、フロントエンドは Relay の Fragment / Query を通じて必要な項目を宣言し、backend は GraphQL schema、認可、業務 use case、DB pagination を分離して扱える。

### GraphQL / Relay を変更するときの流れ

GraphQL の field、input、object type、resolver、または frontend operation を変更する場合は、先に backend の GraphQL 契約を更新し、その後 frontend の operation と generated artifact を更新する。

1. backend の GraphQL resolver / object type / input type を更新する。
2. resolver から呼ばれる service / repository / mapper を更新する。
3. `npm run graphql:schema` で `apps/backend/schema.graphql` を更新する。
4. frontend の Relay operation / fragment を更新する。
5. `npm run relay` で generated artifact を更新する。
6. `npm run relay:validate` で schema と operation の整合性を確認する。
7. `npm run typecheck` で frontend / backend の型不整合を確認する。

この順にすると、backend schema の変更漏れ、frontend operation の field 名ずれ、generated artifact の更新漏れを検出しやすい。

Relay compiler 対象の typed operation / fragment は `apps/frontend/src/lib/relay/application-operations.graphql.ts` に置く。GraphQL schema や operation を変更した後は、以下のコマンドで schema と生成 artifact を更新・検証する。

```bash
npm run graphql:schema
npm run relay
npm run relay:validate
npm run typecheck
```

- GraphQL schema: `apps/backend/schema.graphql`
- Relay compiler config: `apps/frontend/relay.config.json`
- Relay generated artifacts: `apps/frontend/src/lib/relay/__generated__/`

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
