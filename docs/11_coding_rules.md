# コーディングルール

この文書は ReviewFlow の実装・リファクタ・レビューで守る判断基準をまとめる。

AI エージェントに作業させる場合は、`.agents/skills/reviewflow-portfolio/SKILL.md` を入口にし、必要に応じて `references/` と本ドキュメントを読む。

## 基本姿勢

- ReviewFlow は単なる CRUD ではなく、申請・承認・差し戻し・再提出を扱う業務ワークフローとして実装する。
- TypeScript strict 前提で書く。
- `any` は避け、OpenAPI 生成型、DTO、domain type、Zod schema、`unknown` の narrow を使う。
- 命名は業務意図が分かるものにする。
  - 良い例: `submitApplication`, `approveApplication`, `returnApplicationForCorrection`, `resubmitApplication`
  - 避ける例: `process`, `handle`, `update`, `execute`
- validation、authorization、workflow transition、persistence、response mapping、request logging、business audit logging を混ぜない。
- 新しい package、汎用 framework、過剰な interface は、明確な必要がある場合だけ追加する。

## 作業開始時の Plan

ReviewFlow のコードや docs を変更するときは、以下の順で確認する。

1. 影響領域を特定する。
   - frontend UI
   - backend API
   - workflow
   - authorization
   - tenant / space scoping
   - docs / README
   - portfolio presentation
2. 関連 docs と実装を読む。
   - `docs/05_architecture.md`
   - `docs/06_backend_design.md`
   - `docs/07_frontend_design.md`
   - `docs/08_auth_and_multitenant.md`
   - `docs/09_workflow_and_approval.md`
   - `docs/10_correction_feature.md`
3. 既存実装の責務分離と naming に合わせる。
4. セキュリティと workflow の不変条件を確認する。
   - backend authorization
   - `tenantId` scoping
   - `groupId` / space scoping
   - application status transition validity
   - current approval step assignment
   - audit log requirement
5. 正しいレイヤーに実装する。
   - UI: frontend component
   - API coordination: Server Action / server-side utility
   - request mapping: Controller
   - business rule: Service / Policy / Validator / Workflow
   - persistence: Repository
6. リスクの高い業務ルールにはテストを追加・更新する。
7. API 契約が変わる場合は Swagger / OpenAPI と frontend generated types を更新する。
8. 挙動、設計、セットアップ、ポートフォリオ説明に影響する場合は README / docs を更新する。
9. まず狭い検証を行い、影響範囲が広い場合は `lint` / `typecheck` / `test` / `build` へ広げる。

## Frontend

### Next.js App Router

- `apps/frontend/src/app` を routing 層として扱う。
- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, route-level `actions.ts` を App Router の責務に合わせて使う。
- 原則として Server Component で data fetch する。
- Client Component は以下に限定する。
  - form
  - modal
  - tab
  - dropdown
  - local UI state
  - browser API
  - Server Component で代替できない polling
- `useEffect` は原則避ける。CSV export job の状態監視など、ブラウザ側で必要な場合だけ使う。

### Data Fetching

- fetch は `page.tsx`、Server Component、`actions.ts`、server-only utility に寄せる。
- `INTERNAL_API_KEY`、JWT、HttpOnly cookie の値をブラウザに渡さない。
- API レスポンスは OpenAPI 生成型または型付き wrapper で扱う。
- React component 内で ad hoc な `unknown` parse や response shaping を増やさない。
- page ごとに必要データを明確にする。

### Form

- form state は React Hook Form を使う。
- validation schema は Zod で表現する。
- 動的フォームは `field_type` ごとの描画 component に分ける。
- returned 状態では、修正対象 field のみ編集可能にする。
- 修正コメントは対象 field の近くに表示する。
- UI の編集可否は UX のための制御であり、backend が同じ制約を必ず検証する。

### Component / Directory

- その page / route でしか使わない component は同階層の `_components` に置く。
- 複数 page で使う app component は `src/app/_components` など既存 shared location に置く。
- 機能非依存の UI primitive は `src/components/ui` に置く。
- API client、server utility、定数、汎用 helper は `src/lib` に置く。
- data fetch、mutation、presentation を 1 つの巨大 component に混ぜない。

### UI State

ユーザー向け data view では、必要に応じて以下を用意する。

- loading state
- error state
- empty state
- permission-denied state
- mutation success / failure feedback

ReviewFlow 固有の画面では、以下の業務文脈が分かるようにする。

- application status
- current approval step
- correction comments and target fields
- approval / correction history
- CSV export job state

## Backend

### NestJS Structure

- Controller は request / response mapping に集中する。
- DTO は API 入出力契約と validation を表す。
- Service は use case を orchestrate する。
- Policy は authorization と workflow permission を判定する。
- Validator は input / state の妥当性を判定する。
- Repository は database access を担当する。
- Repository は用途に必要な relation や read-model 用の値を取得時点で揃える。Service で不足 relation の追加 hydrate や response 用の過剰な成形をしない。
- Entity は永続化 shape を表す。
- Audit log service / interceptor は business event を記録する。

Controller に workflow logic や複雑な業務ルールを書かない。

### Authorization / Scoping

- 認可は必ず backend で行う。
- frontend の role check や button hidden だけで認可を完結させない。
- client input の `tenantId` を信頼しない。
- 業務データの query には tenant scope を必ず含める。
- space-level resource では `groupId` scope も必ず含める。
- `tenantId`, `groupId`, `userId`, tenant role, space role, applicant owner, application status, current approval step を必要に応じて組み合わせて判定する。
- role や status の条件が複数箇所に出る場合は、Policy / AccessService / Workflow に寄せる。

### Workflow

- 状態遷移は workflow / policy class に集約する。
- 不正な遷移は明示的に拒否する。
- approval、return、resubmit、reject は generic update ではなく業務操作として実装する。
- `draft` / `published` から直接 approval できない。
- `returned` 以外から resubmit できない。
- `approved` / `rejected` を再度 review に戻さない。
- allowed / forbidden transition はテストで確認する。

### Persistence

- TypeORM の entity / repository / migration は既存 pattern に合わせる。
- 現行構成では PostgreSQL を使う。DB 方言に依存する migration や raw SQL を書く前に `docker-compose.yml`、migrations、TypeORM config を確認する。
- database-dialect-specific logic を business logic に入れない。
- 複数 record を整合させる必要がある use case では transaction を検討する。
  - application status + approval history
  - return for correction + correction items + audit log
  - resubmission + correction resolution + status transition
  - export job creation + scoped export metadata

### Audit / Logging

- 重要な業務操作は audit log に残す。
- request / operational log と business audit log を混ぜない。
- Pino structured logging を operational log に使う。
- password、JWT、applicant access token、API key、secret は log に出さない。

## API / OpenAPI

- API contract が変わる場合は Swagger / OpenAPI decorator を更新する。
- backend contract 変更後は frontend の API 型を再生成する。
- status code の使い分けを揃える。
  - `400`: invalid input / invalid transition
  - `401`: unauthenticated
  - `403`: authenticated but forbidden
  - `404`: caller scope から resource が見えない
  - `409`: conflict
- cross-tenant resource の存在が error message から漏れないようにする。
- Entity をそのまま response として返すより、必要に応じて mapper / presenter で整形する。

## Testing

業務リスクの高い箇所を優先してテストする。

- authorization policy
- tenant / group scoping
- application workflow transition
- correction target field restriction
- CSV export scoping
- important operation audit log
- forbidden / invalid API behavior

Frontend test では以下を重視する。

- form validation
- actions / server utilities
- critical page states
- correction UI behavior
- generated API type assumptions

Backend test では以下を重視する。

- pure policy / workflow module
- service orchestration
- tenant scope が抜けやすい repository query
- controller / API behavior for auth and validation

E2E は portfolio-critical flow に絞る。

- signup / login
- create form and approval flow
- submit application
- approve application
- return for correction
- resubmit
- reject
- create or verify CSV export job

## Definition Of Done

ReviewFlow の変更は、以下を満たすまで完了扱いにしない。

- backend authorization が frontend visibility とは別に担保されている。
- tenant / space boundary が守られている。
- invalid workflow transition が拒否される。
- 重要な業務操作が audit log に残る。
- 必要な data view に loading / error / empty state がある。
- API contract 変更時に OpenAPI 生成型が更新されている。
- policy、workflow、validation、API behavior の変更に必要なテストがある。
- portfolio 説明や利用者向け挙動が変わる場合、README / docs が更新されている。

## Git / タスク

- 1タスク1PR 相当で進める。
- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) に従う。
  - 形式: `<type>[optional scope][!]: <description>`
  - よく使う `type`: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`, `ci`
  - 破壊的変更がある場合は subject に `!` を付けるか、本文に `BREAKING CHANGE:` を書く。
  - 例: `feat(auth): add tenant-scoped login`
  - 例: `fix(api): reject invalid application transition`
  - 例: `docs: describe workflow review criteria`
- 生成コードも review 対象として扱う。
