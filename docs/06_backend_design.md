# NestJS モジュール構成

`AppModule` に登録されている主要モジュール:

- `HealthModule` — `/health`, `/ready`
- `AuthModule` — 登録、ログイン、パスワードリセット、`me`、プロフィール更新、メールアドレス変更、パスワード変更
- `UsersModule` — テナント内ユーザー管理
- `InvitationsModule` — メンバー招待・受諾
- `GroupsModule` — スペース CRUD・メンバー管理（API パスは `groups`、Swagger タグは `spaces`）
- `FormDefinitionsModule` — フォーム定義・フィールド・公開
- `ApprovalFlowsModule` — 承認フロー定義
- `ApplicationsModule` — 申請 CRUD・提出・承認・差戻・却下・修正
- `ExportJobsModule` — CSV エクスポート
- `AuditLogsModule` — 監査ログ一覧
- `MailModule` — Nodemailer によるメール送信

横断機能（専用 Nest モジュールではない）:

- `apps/backend/src/app/guards/` — `InternalApiKeyGuard`, `JwtAuthGuard`, `RolesGuard`, `ApplicantAccessGuard`
- `apps/backend/src/decorators.ts` — カスタムデコレータ
- `apps/backend/src/models/repositories/` — 永続化層

## 設計ルール

- Controller には業務ロジックを書かない
- Service がユースケースをオーケストレーションする
- 永続化は Repository 層に寄せる（`models/repositories/`）
- DTO を必須にする
- `tenant_id` 条件は認証コンテキストと Repository クエリで強制する
- `form_definitions` / `approval_flows` / `approval_steps` / `applications` / `export_jobs` は `tenant_id` と `group_id` の両方で scope する
- UI/仕様では space、backend 実装では `groups` / `group_members` と呼ぶ
- space 業務データでは `tenant_admin` はテナント内全 group、`GroupMemberRole.admin` は自 group の管理、`GroupMemberRole.user` は自 group 内の申請作成・自分の申請閲覧・割当承認のみ許可する
- space access check は `SpaceAccessService` に集約し、各業務 Service は orchestration と業務固有 validation に寄せる
- 既存ユーザーの space 追加は `tenant_admin` のみが実行できる。space admin は自 space の運用権限を持つが、テナント内ユーザーを space に参加させる権限は持たない
- space member 削除は `tenant_admin` と対象 space の `GroupMemberRole.admin` が実行できる。ただし最後の `GroupMemberRole.admin` は削除不可
- `audit_logs.group_id` は nullable とし、tenant-level event は null、space-level event は `groupId` を保存する
- 業務監査ログは `BusinessAuditLogService` から明示的に記録する。Pino のリクエストログとは別用途であり、誰が・いつ・どの対象に・何をし・状態/ロールがどう変わったかを追跡する。

## 主なユースケースサービス

| 領域 | サービス |
| --- | --- |
| 認証 | `AuthService`, `AuthPasswordResetService`, `AuthEmailChangeService` |
| 招待 | `InvitationsService` |
| ユーザー | `UsersService` |
| スペース | `GroupsService`, `SpaceAccessService` |
| フォーム定義 | `FormDefinitionsService` |
| 承認フロー | `ApprovalFlowsService` |
| 申請（統合） | `ApplicationsService` |
| 申請作成 | `ApplicationCreationService` |
| 申請提出 | `ApplicationSubmissionService` |
| 承認操作 | `ApplicationReviewActionService` |
| 差し戻し | `ApplicationCorrectionService` |
| CSV | `ExportJobsService` |
| 監査ログ | `AuditLogsService`, `BusinessAuditLogService` |
| メール | `MailService` |

テナント作成は `AuthRepository.createTenantAdmin()` で行い、専用の `TenantService` は持たない。差し戻しは `ApplicationsModule` 内の `ApplicationCorrectionService` が担当し、独立した `correction-requests` モジュールはない。
パスワード再設定は `AuthPasswordResetService`、メールアドレス変更の確認トークン発行・確定は `AuthEmailChangeService` が担当する。`AuthService` は認証 facade として登録・ログイン・トークン発行・プロフィール更新・パスワード変更・パスワード再設定・メールアドレス変更の委譲を扱う。

## ポリシー・バリデータ

| クラス | 役割 |
| --- | --- |
| `ApplicationAccessPolicy` | 申請の閲覧・レビュー操作可否 |
| `ApplicationTransitionPolicy` | 申請状態の前提チェックと状態遷移 |
| `ApplicationFormValueValidator` | フォーム入力値の検証 |

## 重要な業務ロジック

### Applications 領域

- 申請作成・下書き更新: `ApplicationCreationService`
- 提出・再提出: `ApplicationSubmissionService`（内部で `ApplicationTransitionPolicy` を使用）
- 承認・却下・差戻: `ApplicationReviewActionService`
- 差し戻し対象・修正関連: `ApplicationCorrectionService`
- 承認フロー解決: `ApplicationApprovalFlowResolver`

### 承認フロー

- 次ステップ決定・最終承認判定: `ApplicationTransitionPolicy`
- 承認可能ユーザー判定: `ApplicationAccessPolicy`
