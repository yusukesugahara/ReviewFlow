# NestJSモジュール構成
- auth
- tenants
- users
- invitations
- form-templates
- approval-flows
- applications
- correction-requests
- export-jobs
- audit-logs
- common

## common 配下に置くもの
- guards
- decorators
- filters
- interceptors
- pipes
- typeorm

## 設計ルール
- Controller には業務ロジックを書かない
- Service がユースケースを持つ
- TypeORM 呼び出しは Service 直書きでも可だが、複雑化したら Repository 相当へ分離する
- DTO を必須にする
- tenant_id 条件は共通関数で強制する

## 主なユースケースサービス
- AuthService
- TenantService
- InvitationService
- FormTemplateService
- ApprovalFlowService
- ApplicationService
- CorrectionRequestService
- ExportJobService
- AuditLogService

## 重要な業務ロジック
### ApplicationService
- 申請作成
- 下書き更新
- 提出
- 再提出
- 詳細取得
- 一覧取得

### CorrectionRequestService
- 差し戻し作成
- 修正対象取得
- returned 時の編集可能フィールド判定

### ApprovalFlowService
- 次ステップ決定
- 最終承認判定
- 承認可能ユーザー判定
