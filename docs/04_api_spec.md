# API基本方針
- すべてJSON API
- 認証必須APIでは JWT 内の tenant_id と role を利用する
- クライアントから tenant_id を受け取って信頼しない
- テナントスコープはサーバー側で強制する

## Auth

### POST /auth/login
request:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```
response:
```json
{
  "accessToken": "jwt",
  "user": {
    "id": "user_1",
    "tenantId": "tenant_1",
    "role": "tenant_admin",
    "name": "Admin User",
    "email": "user@example.com"
  }
}
```

### GET /auth/me
response:
```json
{
  "id": "user_1",
  "tenantId": "tenant_1",
  "role": "tenant_admin",
  "name": "Admin User",
  "email": "user@example.com"
}
```

## Invitations

### POST /invitations
権限: tenant_admin
request:
```json
{
  "email": "member@example.com",
  "role": "approver"
}
```

### POST /invitations/accept
request:
```json
{
  "token": "invite_token",
  "name": "Member User",
  "password": "password"
}
```

## Users（テナントスコープ）

### GET /users
権限: tenant_admin  
同一テナント内のユーザー一覧（`password_hash` は返さない）。

### PATCH /users/:id/role
権限: tenant_admin  
request:
```json
{
  "role": "approver"
}
```
- 付与可能な `role` は `tenant_admin` / `approver` / `applicant`（`platform_admin` は不可）。
- 自分自身のロールは変更不可。
- **最後の 1 人の tenant_admin** を他ロールへ落とすことは不可。

## Form Templates

### GET /form-templates
権限: tenant_admin

### GET /form-templates/:id
権限: tenant_admin  
単一テンプレート（`fields` 含む）を返す。

### POST /form-templates
権限: tenant_admin
request:
```json
{
  "name": "経費申請",
  "description": "経費精算用フォーム"
}
```

### POST /form-templates/:id/fields
権限: tenant_admin
request:
```json
{
  "fieldKey": "expense_title",
  "label": "件名",
  "fieldType": "text",
  "required": true,
  "placeholder": "件名を入力",
  "helpText": "申請の件名",
  "sortOrder": 1,
  "options": []
}
```

### POST /form-templates/:id/publish
権限: tenant_admin

## Approval Flows

### GET /approval-flows
権限: tenant_admin  
テナント内の承認フロー一覧（`steps` を `step_order` 昇順で含む）。

### POST /approval-flows
権限: tenant_admin。参照する `formTemplateId` のテンプレートは **published** であること。`steps[].stepOrder` は **1 からの連番**で重複不可。
request:
```json
{
  "formTemplateId": "form_1",
  "name": "経費申請フロー",
  "steps": [
    {
      "stepOrder": 1,
      "stepName": "一次承認",
      "approverRole": "approver",
      "canReturn": true
    },
    {
      "stepOrder": 2,
      "stepName": "最終承認",
      "approverRole": "tenant_admin",
      "canReturn": true
    }
  ]
}
```

## Applications

### GET /applications
権限: applicant, approver, tenant_admin  
- applicant: 自分の申請のみ  
- approver: **in_review** かつ現在ステップの `approver_role` が `approver` のもののみ  
- tenant_admin: テナント内の全申請

### POST /applications
権限: applicant。`formTemplateId` は **published** のテンプレートのみ。有効な承認フローが複数ある場合は `approvalFlowId`（UUID）を指定。`values` のキーは **field_key**（必須項目は提出前に満たす必要あり）。
request:
```json
{
  "formTemplateId": "form_1",
  "approvalFlowId": "optional-flow-uuid",
  "values": {
    "expense_title": "出張交通費",
    "amount": 12000
  }
}
```
response:
```json
{
  "id": "app_1",
  "status": "draft"
}
```

### PATCH /applications/:id
権限: applicant
- 現実装: **draft のみ**更新可能（`values` は field_key 単位でマージ）。
- returned の場合は correction_request_items 対象フィールドのみ更新可能（別フェーズ）

### POST /applications/:id/submit
権限: applicant

### GET /applications/:id
権限:
- applicant: 自分の申請のみ
- approver: 担当対象のみ
- tenant_admin: テナント内全件

## Approval Actions

### POST /applications/:id/approve
権限: approver, tenant_admin  
`in_review` のときのみ。現在ステップの `approver_role` が承認者ロールと一致する **approver**、または **tenant_admin**（いずれのステップでも可）。最終ステップ承認後は `approved`。任意 `comment`。

### POST /applications/:id/return
権限: approver, tenant_admin  
現在ステップの **`can_return` が true** のときのみ。`application_approvals`（action=returned）と **`correction_requests` / `correction_request_items`** を作成し、申請は `returned`。オープンな correction が既にある場合は 409。
request:
```json
{
  "overallComment": "修正をお願いします",
  "fields": [
    {
      "fieldId": "field_1",
      "comment": "正式名称で入力してください"
    },
    {
      "fieldId": "field_2",
      "comment": "番地まで入力してください"
    }
  ]
}
```

### POST /applications/:id/reject
権限: approver, tenant_admin  
`in_review` のみ。承認と同様の担当判定。申請は `rejected`。任意 `comment`。

### POST /applications/:id/resubmit
権限: applicant  
`returned` かつ **open** の `correction_request` があるときのみ。必須項目を再検証後、`returned` → `in_review`（先頭ステップから）。correction は `resolved`。

### GET /applications/:id/corrections
権限: applicant, approver, tenant_admin  
当該申請の correction_requests 一覧（items に `form_field_id` / `field_key`）。履歴用。

### GET /applications/:id/correction-targets
権限: applicant, approver, tenant_admin  
**修正対象取得**（Phase 7）。`applicationStatus` と、**最新の `open` の correction_request** 1件分（無ければ `openCorrection: null`）。各 item に `field_key` / `label` / `fieldType` / `required` / 項目コメント / **`currentValue`**（申請の現在値）を含める。

## Export Jobs

### POST /export-jobs
権限: tenant_admin  
request (任意フィルタ):
```json
{
  "status": "in_review",
  "formTemplateId": "optional-template-uuid"
}
```
- CSV は **列展開方式**（申請共通固定列 + `form_fields.field_key` ごとの列）。
- 値は `application_field_values.value_json` を列に展開（object/array は JSON 文字列）。

### GET /export-jobs/:id
権限: tenant_admin

### GET /export-jobs/:id/download
権限: tenant_admin  
`status=completed` のジョブのみダウンロード可能（`text/csv`）。

## Audit Logs

### GET /audit-logs
権限: tenant_admin  
query:
- `limit`（任意, 1..200, 既定 50）
- `actionType`（任意, 前方一致）

レスポンスは `tenant_id` スコープで `created_at` 降順。  
各要素は `actionType` / `targetType` / `targetId` / `metadataJson` / `createdAt` を返す。
