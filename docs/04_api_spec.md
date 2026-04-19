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

## Form Templates

### GET /form-templates
権限: tenant_admin

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

### POST /approval-flows
権限: tenant_admin
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

### POST /applications
権限: applicant
request:
```json
{
  "formTemplateId": "form_1",
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
- draft の場合は通常編集可能
- returned の場合は correction_request_items 対象フィールドのみ更新可能

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

### POST /applications/:id/return
権限: approver, tenant_admin
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

### POST /applications/:id/resubmit
権限: applicant

### GET /applications/:id/corrections
権限: applicant, approver, tenant_admin

## Export Jobs

### POST /export-jobs
権限: tenant_admin

### GET /export-jobs/:id
権限: tenant_admin

### GET /export-jobs/:id/download
権限: tenant_admin

## Audit Logs

### GET /audit-logs
権限: tenant_admin
