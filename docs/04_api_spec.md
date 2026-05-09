# API基本方針
- すべてJSON API
- 認証必須APIでは JWT 内の tenant_id と role を利用する
- クライアントから tenant_id を受け取って信頼しない
- テナントスコープはサーバー側で強制する
- 業務データは `tenant_id` と `group_id` の両方でスコープする。UI 上は group を space と呼ぶ。
- space 業務 API は `groupId` を query/body で明示する。サーバー側で group の tenant と利用者の所属/権限を検証する。
- スペースロールは `group_members.role` でスペースごとに判定する。同じユーザーが A スペースでは `admin`、B スペースでは `user` になるケースを許容する。
- 現段階では既存 path を維持する。次段階で `/groups/:groupId/form-definitions` / `/groups/:groupId/applications` のような nested path へ寄せる。
- `audit_logs.group_id` は nullable。tenant-level event は `null`、space-level event は対象 `groupId` を保持する。

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
  "role": "tenant_user"
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
  "role": "tenant_user"
}
```
- 付与可能な `role` は `tenant_admin` / `tenant_user` / `tenant_user`（`tenant_admin` は不可）。
- 自分自身のロールは変更不可。
- **最後の 1 人の tenant_admin** を他ロールへ落とすことは不可。

### DELETE /users/:id
権限: tenant_admin  
同一テナント内ユーザーを削除する。実装上は `is_active = false` にする論理削除。

- 自分自身は削除不可。
- **最後の 1 人の有効な tenant_admin** は削除不可。
- 削除済みユーザーはログインおよび既存 JWT での認証が不可。

### PATCH /users/:id/restore
権限: tenant_admin  
論理削除済みユーザーを復活する。`is_active = true` に戻す。

- 対象ユーザーは同一テナント内に存在する必要がある。
- 復活後は通常のログインと JWT 認証が可能。

### POST /groups/:groupId/members
権限: tenant_admin  
同一テナント内の既存ユーザーをスペースメンバーとして追加する。

request:
```json
{
  "userId": "00000000-0000-4000-8000-000000000002",
  "role": "user"
}
```

- `role` は `admin` / `user`。
- `role` はこの `groupId` に対するロールであり、他スペースのロールには影響しない。
- 対象ユーザーは同一テナント内に存在する必要がある。
- 既にスペースメンバーの場合は重複エラー。

### DELETE /groups/:groupId/members/:userId
権限: tenant_admin / 対象スペースの space admin  
対象ユーザーをスペースメンバーから削除する。

- 対象スペースは同一テナント内に存在する必要がある。
- space admin は自分が admin のスペースでのみ実行できる。
- **最後の 1 人の space admin** は削除不可。

## Form Definitions

### GET /form-definitions
権限: tenant_admin, tenant_user（group admin）  
query: `groupId` 必須。tenant_admin はテナント内 group、group admin は自分が admin の group のみ。

### GET /form-definitions/:id
権限: tenant_admin, tenant_user（group admin）  
単一フォーム定義（`fields` 含む）を返す。

### POST /form-definitions
権限: tenant_admin, tenant_user（group admin）
request:
```json
{
  "groupId": "group_1",
  "name": "経費申請",
  "description": "経費精算用フォーム"
}
```

### POST /form-definitions/:id/fields
権限: tenant_admin, tenant_user（group admin）
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

### POST /form-definitions/:id/publish
権限: tenant_admin, tenant_user（group admin）

## Approval Flows

### GET /approval-flows
権限: tenant_admin, tenant_user（group admin）  
query: `groupId` 必須。指定 group 内の承認フロー一覧（`steps` を `step_order` 昇順で含む）。

### POST /approval-flows
権限: tenant_admin, tenant_user（group admin）。参照する `formDefinitionId` のフォーム定義は同一テナント・同一 group に存在すること。`steps[].assigneeUserId` は同一 group 所属ユーザー。`steps[].stepOrder` は **1 からの連番**で重複不可。
request:
```json
{
  "groupId": "group_1",
  "formDefinitionId": "form_1",
  "name": "経費申請フロー",
  "steps": [
    {
      "stepOrder": 1,
      "stepName": "一次承認",
      "assigneeUserId": "tenant_user",
      "canReturn": true
    },
    {
      "stepOrder": 2,
      "stepName": "最終承認",
      "assigneeUserId": "tenant_admin",
      "canReturn": true
    }
  ]
}
```

## Applications

### GET /applications
権限: tenant_user, tenant_admin  
query: `groupId` 必須。
- tenant_admin: テナント内の指定 group の申請
- group admin: 自分が admin の group の申請
- group user: 所属 group 内で、自分の申請または **in_review** かつ現在ステップの `assignee_user_id` が自分のもの

### POST /applications
権限: tenant_user, tenant_admin。`groupId` 必須。`formDefinitionId` は同一 group の **published** フォーム定義のみ。有効な承認フローが複数ある場合は `approvalFlowId`（UUID）を指定。`values` のキーは **field_key**（必須項目は提出前に満たす必要あり）。
request:
```json
{
  "groupId": "group_1",
  "formDefinitionId": "form_1",
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
権限: tenant_user
- 現実装: **draft のみ**更新可能（`values` は field_key 単位でマージ）。
- returned の場合は correction_request_items 対象フィールドのみ更新可能（別フェーズ）

### POST /applications/:id/submit
権限: tenant_user

### GET /applications/:id
権限:
- tenant_user: 自分の申請のみ
- tenant_user: 担当対象のみ
- group admin: 自分が admin の group の申請
- tenant_admin: テナント内全件

## Approval Actions

### POST /applications/:id/approve
権限: tenant_user, tenant_admin  
`in_review` のときのみ。tenant_admin はテナント内 group、group admin は自分が admin の group、group user は現在ステップの `assignee_user_id` が自分の申請のみ実行可能。最終ステップ承認後は `approved`。任意 `comment`。

### POST /applications/:id/return
権限: tenant_user, tenant_admin  
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
権限: tenant_user, tenant_admin  
`in_review` のみ。承認と同様の担当判定。申請は `rejected`。任意 `comment`。

### POST /applications/:id/resubmit
権限: tenant_user  
`returned` かつ **open** の `correction_request` があるときのみ。必須項目を再検証後、`returned` → `in_review`（先頭ステップから）。correction は `resolved`。

### GET /applications/:id/corrections
権限: tenant_user, tenant_user, tenant_admin  
当該申請の correction_requests 一覧（items に `form_field_id` / `field_key`）。履歴用。

### GET /applications/:id/correction-targets
権限: tenant_user, tenant_user, tenant_admin  
**修正対象取得**（Phase 7）。`applicationStatus` と、**最新の `open` の correction_request** 1件分（無ければ `openCorrection: null`）。各 item に `field_key` / `label` / `fieldType` / `required` / 項目コメント / **`currentValue`**（申請の現在値）を含める。

## Export Jobs

### POST /export-jobs
権限: tenant_admin, tenant_user（group admin）  
request (任意フィルタ):
```json
{
  "groupId": "group_1",
  "status": "in_review",
  "formDefinitionId": "optional-definition-uuid"
}
```
- CSV は **列展開方式**（申請共通固定列 + `form_fields.field_key` ごとの列）。
- 値は `application_field_values.value_json` を列に展開（object/array は JSON 文字列）。

### GET /export-jobs/:id
権限: tenant_admin, tenant_user（group admin）

### GET /export-jobs/:id/download
権限: tenant_admin, tenant_user（group admin）  
`status=completed` のジョブのみダウンロード可能（`text/csv`）。

## Audit Logs

### GET /audit-logs
権限: tenant_admin  
query:
- `limit`（任意, 1..200, 既定 50）
- `actionType`（任意, 前方一致）

レスポンスは `tenant_id` スコープで `created_at` 降順。  
各要素は `actionType` / `targetType` / `targetId` / `metadataJson` / `createdAt` を返す。
