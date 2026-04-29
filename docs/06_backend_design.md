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
- form_templates / approval_flows / approval_steps / applications / export_jobs は tenant_id と group_id の両方で scope する
- UI/仕様では space、backend 実装では groups / group_members と呼ぶ
- space 業務データでは tenant_admin はテナント内全 group、GroupMemberRole.admin は自 group の管理、GroupMemberRole.user は自 group 内の申請作成・自分の申請閲覧・割当承認のみ許可する
- space access check は SpaceAccessService に集約し、各業務 Service は orchestration と業務固有 validation に寄せる
- audit_logs.group_id は nullable とし、tenant-level event は null、space-level event は groupId を保存する

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
