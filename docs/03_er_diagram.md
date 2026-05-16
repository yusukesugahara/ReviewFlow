# テーブル定義（テキストER）

## ER概要

```mermaid
erDiagram
  tenants ||--o{ users : owns
  tenants ||--o{ groups : owns
  tenants ||--o{ invitations : owns
  tenants ||--o{ audit_logs : records

  users ||--o{ group_members : joins
  users ||--o{ invitations : invites
  users ||--o{ applications : submits
  users ||--o{ application_approvals : acts

  groups ||--o{ group_members : has
  groups ||--o{ form_definitions : has
  groups ||--o{ approval_flows : has
  groups ||--o{ applications : has
  groups ||--o{ export_jobs : has

  form_definitions ||--o{ form_fields : defines
  form_definitions ||--o{ approval_flows : uses
  form_definitions ||--o{ applications : receives

  approval_flows ||--o{ approval_steps : contains
  approval_flows ||--o{ applications : routes
  approval_steps ||--o{ application_approvals : produces

  applications ||--o{ application_field_values : stores
  applications ||--o{ application_approvals : records
  applications ||--o{ correction_requests : receives
  correction_requests ||--o{ correction_request_items : contains
  form_fields ||--o{ application_field_values : captures
  form_fields ||--o{ correction_request_items : targets
```

## 主要テーブル分類

| 分類 | テーブル | 役割 |
| --- | --- | --- |
| テナント基盤 | `tenants`, `users`, `invitations` | 組織、ユーザー、招待を管理する。 |
| スペース管理 | `groups`, `group_members` | スペースとスペース単位のロールを管理する。 |
| フォーム定義 | `form_definitions`, `form_fields` | 申請フォームの構造を管理する。 |
| 承認定義 | `approval_flows`, `approval_steps` | フォームごとの承認ルートを管理する。 |
| 申請実行 | `applications`, `application_field_values`, `application_approvals` | 申請データ、入力値、承認操作を保持する。 |
| 差し戻し | `correction_requests`, `correction_request_items` | 差し戻し理由と修正対象フィールドを保持する。 |
| 運用 | `export_jobs`, `audit_logs` | CSV出力ジョブと監査ログを管理する。 |

## tenants
- id: string (PK)
- name: string
- plan: enum(free, standard, pro)
- status: enum(trial, active, suspended)
- created_at: datetime
- updated_at: datetime

同一 `tenant_id` / `group_id` に複数のフォーム定義を保持できる。申請レコードは作成時に利用した `form_definition_id` を保持する。

## users
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- name: string
- email: string
- password_hash: string
- role: enum(tenant_admin, tenant_user)
- is_active: boolean
- created_at: datetime
- updated_at: datetime

## invitations
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- email: string
- role: enum(tenant_admin, tenant_user)
- group_id: string nullable (FK -> groups.id)
- group_role: enum(admin, user) nullable
- token: string
- status: enum(pending, accepted, expired, revoked)
- invited_by_user_id: string (FK -> users.id)
- expires_at: datetime
- created_at: datetime

## groups
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- name: string
- description: string nullable
- created_by_user_id: string (FK -> users.id)
- created_at: datetime
- updated_at: datetime

## group_members
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- group_id: string (FK -> groups.id)
- user_id: string (FK -> users.id)
- role: enum(admin, user)
- invited_by_user_id: string nullable (FK -> users.id)
- created_at: datetime
- updated_at: datetime

`group_members.role` はスペースごとのロールであり、同じユーザーでもスペースごとに異なる値を持てる。例: A スペースでは `admin`、B スペースでは `user`。

## form_definitions
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- group_id: string (FK -> groups.id)
- name: string
- description: string nullable
- status: enum(draft, published, archived)
- created_by_user_id: string (FK -> users.id)
- created_at: datetime
- updated_at: datetime

## form_fields
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- form_definition_id: string (FK -> form_definitions.id)
- field_key: string
- label: string
- field_type: enum(text, textarea, number, date, select, radio, checkbox)
- required: boolean
- placeholder: string nullable
- help_text: string nullable
- options_json: json nullable
- sort_order: int
- created_at: datetime
- updated_at: datetime

## approval_flows
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- group_id: string (FK -> groups.id)
- form_definition_id: string (FK -> form_definitions.id)
- name: string
- is_active: boolean
- created_at: datetime
- updated_at: datetime

## approval_steps
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- group_id: string (FK -> groups.id)
- approval_flow_id: string (FK -> approval_flows.id)
- step_order: int
- step_name: string
- assignee_user_id: string (FK -> users.id)
- assignee_user_ids: json/text nullable
- can_return: boolean
- created_at: datetime
- updated_at: datetime

## applications
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- group_id: string (FK -> groups.id)
- applicant_user_id: string nullable (FK -> users.id)
- applicant_email: string
- form_definition_id: string (FK -> form_definitions.id)
- approval_flow_id: string (FK -> approval_flows.id)
- current_step_order: int nullable
- status: enum(draft, published, submitted, in_review, returned, approved, rejected)
- submitted_at: datetime nullable
- created_at: datetime
- updated_at: datetime

## application_field_values
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- application_id: string (FK -> applications.id)
- form_field_id: string (FK -> form_fields.id)
- value_json: json
- created_at: datetime
- updated_at: datetime

## application_approvals
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- application_id: string (FK -> applications.id)
- approval_step_id: string (FK -> approval_steps.id)
- acted_by_user_id: string (FK -> users.id)
- action: enum(approved, returned, rejected)
- comment: string nullable
- acted_at: datetime

## correction_requests
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- application_id: string (FK -> applications.id)
- requested_by_user_id: string (FK -> users.id)
- status: enum(open, resolved)
- overall_comment: string nullable
- created_at: datetime
- resolved_at: datetime nullable

## correction_request_items
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- correction_request_id: string (FK -> correction_requests.id)
- form_field_id: string (FK -> form_fields.id)
- comment: string nullable
- is_resolved: boolean
- created_at: datetime

## export_jobs
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- group_id: string (FK -> groups.id)
- requested_by_user_id: string (FK -> users.id)
- status: enum(queued, processing, completed, failed)
- filter_json: json nullable
- file_path: string nullable
- started_at: datetime nullable
- finished_at: datetime nullable
- created_at: datetime

## audit_logs
- id: string (PK)
- tenant_id: string (FK -> tenants.id)
- group_id: string nullable (FK -> groups.id)
- actor_user_id: string nullable (FK -> users.id)
- action_type: string
- target_type: string
- target_id: string nullable
- metadata_json: json nullable
- created_at: datetime

## インデックス方針
- users: unique(tenant_id, email)
- groups: unique(tenant_id, name)
- group_members: unique(tenant_id, group_id, user_id), index(tenant_id, user_id)
- form_definitions: index(tenant_id, group_id)
- form_fields: index(tenant_id, form_definition_id, sort_order)
- approval_flows: index(tenant_id, group_id)
- approval_steps: index(tenant_id, group_id)
- approval_steps: unique(approval_flow_id, step_order)
- applications: index(tenant_id, group_id, status, created_at)
- application_field_values: unique(application_id, form_field_id)
- correction_request_items: index(correction_request_id, form_field_id)
- export_jobs: index(tenant_id, group_id, status, created_at)
- audit_logs: index(tenant_id, group_id, created_at), index(tenant_id, created_at)
