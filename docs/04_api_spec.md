# API基本方針
- 認証後の主要画面で使う業務データ取得・更新は、GraphQL / Relay を正の API 契約とする。
- REST API は互換、運用、外部入口、ファイルダウンロードなど用途を限定して残す。
- REST の通常レスポンスは JSON API とし、CSV などの成果物ダウンロードだけ `text/csv` 等の非 JSON レスポンスを許容する。
- 認証必須APIでは JWT 内の tenant_id と role を利用する
- クライアントから tenant_id を受け取って信頼しない
- テナントスコープはサーバー側で強制する
- 業務データは `tenant_id` と `group_id` の両方でスコープする。UI 上は group を space と呼ぶ。
- space 業務 API は `groupId` を query/body で明示する。サーバー側で group の tenant と利用者の所属/権限を検証する。
- スペースロールは `group_members.role` でスペースごとに判定する。同じユーザーが A スペースでは `admin`、B スペースでは `user` になるケースを許容する。
- 現段階では既存 path を維持する。次段階で `/groups/:groupId/form-definitions` / `/groups/:groupId/applications` のような nested path へ寄せる。
- `audit_logs.group_id` は nullable。tenant-level event は `null`、space-level event は対象 `groupId` を保持する。

## GraphQL / Relay と REST の位置づけ

ReviewFlow の認証後 UI は、GraphQL schema と Relay operation / fragment を中心に設計する。申請一覧、申請詳細、承認ステップ、差し戻し履歴、監査ログなど、画面が必要なデータ構造を宣言して取得する領域は GraphQL / Relay を優先する。

REST を残してよい用途は以下に限定する。

- `/health` / `/ready` などの運用・死活監視 endpoint
- CSV などのファイル作成、状態確認、ダウンロード
- 申請者アクセストークンを使う公開申請・差し戻し修正など、認証後 UI とは別の入口
- 外部クライアントや既存フロントエンドとの互換が必要な API
- Swagger / OpenAPI で参照される管理・検証用 API

REST と GraphQL が同じ業務操作を提供する場合でも、業務ロジックを Controller / Resolver に重複実装しない。両方とも同じ Service / Use case に委譲し、認可、状態遷移、バリデーション、監査ログの判断は backend service 層で一元化する。

新しい認証後 UI の API を追加する場合は、原則として GraphQL / Relay で追加する。REST を追加する場合は、上記の用途に該当する理由を明確にし、OpenAPI 参照スキーマも更新する。

## Auth

すべての認証 API は `X-API-Key` ヘッダーが必要。成功レスポンスは `{ "status": 200, "data": ... }` 形式のラッパーで返す。

### POST /auth/register
新規テナントと初回 `tenant_admin` ユーザーを同時作成する。

### POST /auth/login
request:
```json
{
  "email": "user@example.com",
  "password": "password"
}
```
response（`data` 内）:
```json
{
  "access_token": "jwt",
  "user": {
    "id": "user_1",
    "tenantId": "tenant_1",
    "role": "tenant_admin",
    "email": "user@example.com"
  }
}
```

### POST /auth/me
JWT 必須。response（`data` 内）:
```json
{
  "id": "user_1",
  "tenantId": "tenant_1",
  "name": "User Name",
  "roles": ["tenant_admin"],
  "email": "user@example.com"
}
```

### PATCH /auth/me/profile
JWT 必須。ログイン中ユーザーの表示名を更新し、新しい JWT を返す。
request:
```json
{
  "name": "User Name"
}
```

### POST /auth/me/email-change/request
JWT 必須。ログイン中ユーザーのメールアドレス変更確認メールを、新しいメールアドレス宛に送信する。`users.email` はこの時点では変更しない。
request:
```json
{
  "email": "new@example.com"
}
```

### POST /auth/email-change/confirm
メールアドレス変更確認 URL から呼び出す。`email_change_tokens` の token を検証し、未使用かつ期限内なら `users.email` を更新する。確定後は再ログインを前提にする。
request:
```json
{
  "token": "email_change_token"
}
```

### PATCH /auth/me/password
JWT 必須。ログイン中ユーザーの現在パスワードを検証してから新しいパスワードへ更新し、新しい JWT を返す。
request:
```json
{
  "currentPassword": "current_password",
  "newPassword": "new_password"
}
```

### POST /auth/password-reset/request
### POST /auth/password-reset/confirm
### GET /auth/admin/ping
`tenant_admin` 専用の疎通確認。

## Invitations

### POST /invitations
権限: tenant_admin（スペース指定時は space admin も可）
request:
```json
{
  "email": "member@example.com",
  "role": "tenant_user",
  "groupId": "group_1",
  "groupRole": "user"
}
```
`groupId` / `groupRole` は任意。招待作成時に受諾 URL を含む招待メールを送信する（`MAIL_ENABLED=0` で無効化可）。レスポンスには受諾 token を返さない。

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
- 付与可能な `role` は `tenant_admin` / `tenant_user`。
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
query: `groupId` 必須、`includeArchived=true` 任意。tenant_admin はテナント内 group、group admin は自分が admin の group のみ。通常は `archived` 以外を返し、`includeArchived=true` の場合は削除済み（`archived`）フォーム定義を返す。

### GET /form-definitions/:id
権限: tenant_admin, tenant_user（対象 group の member）  
単一フォーム定義（`fields` 含む）を返す。申請詳細表示では、申請レコードに紐づくフォーム項目を表示するため、スペース利用権限があれば参照できる。フォーム定義の作成・編集・公開・アーカイブは引き続き group admin 権限を要求する。

### POST /form-definitions
権限: tenant_admin, tenant_user（group admin）
同一 group に複数のフォーム定義を作成できる。申請作成時に利用フォームを確定するため、公開済みフォームが複数ある group では `POST /applications` の `formDefinitionId` 指定が必須。
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
`fieldType` は `text` / `textarea` / `number` / `date` / `select` / `radio` / `checkbox` / `consent` / `description` / `section`。`description` と `section` は値を保存しない表示専用項目として扱う。

### PATCH /form-definitions/:id/description
権限: tenant_admin, tenant_user（group admin）  
フォーム定義の説明文だけを更新する。公開済みフォームにも適用でき、公開申請フォームの説明欄に反映される。
request:
```json
{
  "description": "申請前に確認してほしい説明文"
}
```

### POST /form-definitions/:id/publish
権限: tenant_admin, tenant_user（group admin）

### POST /form-definitions/:id/archive
権限: tenant_admin, tenant_user（group admin）  
フォーム定義を `archived` に変更し、申請フォーム一覧の通常表示から削除済み一覧へ移動する。既存申請レコードは削除しない。

### POST /form-definitions/:id/restore
権限: tenant_admin, tenant_user（group admin）  
`archived` のフォーム定義を削除前の `draft` / `published` に戻し、通常の申請フォーム一覧へ復元する。削除前状態が不明な既存データは `published` として復元する。

### POST /form-definitions/groups/:groupId/request-access
公開申請フォームの案内メールを送信する。query の `formDefinitionId` は任意だが、同一 group に公開済みフォーム定義が複数ある場合は必須。
request:
```json
{
  "email": "applicant@example.com"
}
```

### GET /form-definitions/public/current
申請者アクセストークンで、公開申請フォームに表示するフォーム定義を取得する。

### GET /form-definitions/public/current/approval-flows
申請者アクセストークンで、公開申請フォーム送信用の有効な承認フロー一覧を取得する。

### POST /public/applications
申請者アクセストークンで公開申請フォームを送信する。作成した申請は入力値を検証したうえでレビュー状態に進める。承認フローはバックエンドが有効な承認フローから自動決定するため、申請者入力としては受け取らない。
request:
```json
{
  "groupId": "group_1",
  "formDefinitionId": "form_1",
  "values": {
    "expense_title": "出張交通費",
    "amount": 12000
  }
}
```

## Approval Flows

### GET /approval-flows
権限: tenant_admin, tenant_user（group admin）  
query: `groupId` 必須。指定 group 内の承認フロー一覧（`steps` を `step_order` 昇順で含む）。

### POST /approval-flows
権限: tenant_admin, tenant_user（group admin）。承認フローは **スペース（`groupId`）単位** で作成する。`formDefinitionId` は不要。`steps[].assigneeUserIds` は同一テナント内ユーザーの配列で、1 ステップに複数人を登録できる。後方互換のため `steps[].assigneeUserId` も受け付けるが、`assigneeUserIds` 指定時はこちらを優先する。`steps[].stepOrder` は **1 からの連番**で重複不可。
request:
```json
{
  "groupId": "group_1",
  "name": "経費申請フロー",
  "steps": [
    {
      "stepOrder": 1,
      "stepName": "一次承認",
      "assigneeUserId": "tenant_user",
      "assigneeUserIds": ["tenant_user", "tenant_admin"],
      "canReturn": true
    },
    {
      "stepOrder": 2,
      "stepName": "最終承認",
      "assigneeUserId": "tenant_admin",
      "assigneeUserIds": ["tenant_admin"],
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
- group user: 所属 group 内で、自分の申請または **in_review** かつ現在ステップの `assignee_user_ids` に自分が含まれるもの
- 一覧レスポンスは `applicantUserId` を含む。`null` は公開フォーム経由など、登録ユーザーに紐づかない利用者申請を表す。フロントでは `draft` / `published` を作成中申請、`applicantUserId: null` を利用者から届いた申請として区別する。

### POST /applications
権限: tenant_user, tenant_admin。`groupId` 必須。`formDefinitionId` は同一 group の **published** フォーム定義のみ。公開済みフォームが1件だけなら後方互換のため省略可だが、複数ある場合は必須。有効な承認フローが複数ある場合は `approvalFlowId`（UUID）を指定。`status` は `draft` または `published` を指定でき、省略時は `draft`。`values` のキーは **field_key**（必須項目は提出前に満たす必要あり）。
request:
```json
{
  "groupId": "group_1",
  "formDefinitionId": "form_1",
  "approvalFlowId": "optional-flow-uuid",
  "status": "published",
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

補足:
- `draft` は申請者の下書きで、承認者の確認対象にはしない。
- `published` は公開申請フォームの作成・案内に利用する状態で、承認処理中の業務ステータスではない。
- 承認に進む申請は `POST /applications/:id/submit` または公開フォーム送信で `in_review` に遷移する。

### PATCH /applications/:id
権限: tenant_user
- **draft / published** は `values` の field_key 単位更新に加え、`formDefinitionId` / `approvalFlowId` の差し替えと `status`（`draft` / `published`）の変更が可能。申請編集画面では編集内容から新しい published フォーム定義と有効な承認フローを作成し、既存申請へ紐づけ直す。
- returned の場合は correction_request_items 対象フィールドのみ更新可能。

### POST /applications/:id/submit
権限: tenant_user
`draft` または `published` から `in_review` に遷移する。承認フローの最初のステップを `current_step` として設定し、必須フィールドを再検証する。

### GET /applications/:id
権限:
- group user: 自分の申請
- group user: 現在ステップの担当対象
- group admin: 自分が admin の group の申請
- tenant_admin: テナント内全件

## Approval Actions

### POST /applications/:id/approve
権限: tenant_user, tenant_admin  
`in_review` のときのみ。tenant_admin はテナント内 group、group admin は自分が admin の group、group user は現在ステップの `assignee_user_ids` に自分が含まれる申請のみ実行可能。最終ステップ承認後は `approved`。任意 `comment`。

### POST /applications/:id/return
権限: tenant_user, tenant_admin  
現在ステップの **`can_return` が true** のときのみ。`application_approvals`（action=returned）と **`correction_requests` / `correction_request_items`** を作成し、申請は `returned`。差し戻し後、申請者メールアドレス宛に修正対象とコメント、申請者向け修正URL（`/apply/access?next=/apply/correction`）を通知する。オープンな correction が既にある場合は 409。
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

### POST /applications/:id/return-email/resend
権限: tenant_user, tenant_admin  
`returned` かつ **open** の `correction_request` がある申請のみ。申請者メールアドレス宛に、同じ修正対象・コメント・申請者向け修正URLを再送する。申請状態や correction の内容は変更しない。

### POST /applications/:id/reject
権限: tenant_user, tenant_admin  
`in_review` のみ。承認と同様の担当判定。申請は `rejected`。任意 `comment`。

### POST /applications/:id/resubmit
権限: tenant_user  
`returned` かつ **open** の `correction_request` があるときのみ。修正対象フィールドと必須項目を再検証後、`returned` → `in_review` に遷移し（`current_step_order = 1`）、correction は `resolved`。

### GET /applications/:id/corrections
権限: tenant_admin, group admin, 申請者, 現在または過去に担当した承認者  
当該申請の correction_requests 一覧（items に `form_field_id` / `field_key`）。履歴用。

### GET /applications/:id/correction-targets
権限: tenant_admin, group admin, 申請者, 現在または過去に担当した承認者  
**修正対象取得**。`applicationStatus` と、**最新の `open` の correction_request** 1件分（無ければ `openCorrection: null`）。各 item に `field_key` / `label` / `fieldType` / `required` / 項目コメント / **`currentValue`**（申請の現在値）を含める。

### GET /public/applications/returned/current
権限: applicant access token  
差し戻しメールで発行された applicant access token に紐づく申請の open correction を返す。レスポンス形状は `GET /applications/:id/correction-targets` と同じ。

### PATCH /public/applications/:id
権限: applicant access token  
`returned` かつ token の `applicationId` に一致する申請のみ。open correction の対象フィールドだけ更新できる。

### POST /public/applications/:id/resubmit
権限: applicant access token  
修正保存後の再提出。token の `applicationId` に一致する `returned` 申請のみ、open correction を `resolved` にして再審査へ戻す。

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
- `formDefinitionId` 指定時は、対象フォームへ提出された申請のみを出力する。
- フォーム作成用の `draft` / `published` 行は申請データCSVに含めない。

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
- `offset`（任意, 0..100000, 既定 0）
- `actionType`（任意, 前方一致）
- `targetType`（任意, 完全一致。主な値は `application` / `user` / `invitation` / `space` / `group_member`）
- `applicationId`（任意, UUID 完全一致）
- `groupId`（任意, UUID 完全一致）
- `targetUserId`（任意, UUID 完全一致）
- `q`（任意, `actionType` / `targetType` / `targetId` / `actorUserId` / `actorEmailSnapshot` / `targetUserId` / `targetEmailSnapshot` / `applicationId` / `summary` / `groupId` の部分一致）
- `createdFrom`（任意, ISO 8601, `createdAt` の開始日時）
- `createdTo`（任意, ISO 8601, `createdAt` の終了日時）

レスポンスは `tenant_id` スコープで `created_at` 降順。  
レスポンスは `logs`, `total`, `limit`, `offset` を返し、フロントでは 50 件単位でページネーションする。

各要素は、後から「誰が、いつ、どの申請/ユーザー/スペースに対して、何をし、状態やロールがどう変わったか」を追えるように、次を返す。

- actor: `actorUserId`, `actorType`, `actorEmailSnapshot`
- target: `targetType`, `targetId`, `targetUserId`, `targetEmailSnapshot`, `applicationId`, `groupId`
- change: `statusFrom`, `statusTo`, `stepOrderFrom`, `stepOrderTo`, `roleFrom`, `roleTo`, `groupRoleFrom`, `groupRoleTo`
- detail: `actionType`, `summary`, `metadataJson`, `createdAt`

主な `actionType`:

- 申請: `application.created`, `application.submitted`, `application.approved`, `application.returned`, `application.corrected`, `application.resubmitted`, `application.rejected`
- 招待: `invitation.created`, `invitation.accepted`
- ユーザー: `user.profile_updated`, `user.password_changed`, `user.role_changed`, `user.deactivated`, `user.restored`
- スペース: `space.created`, `space.updated`, `space.deleted`
- スペースメンバー: `space.member_added`, `space.member_removed`, `space.member_left`, `space.member_role_changed`

メールアドレス変更確定は `user.profile_updated` として記録し、`metadataJson.emailFrom` / `metadataJson.emailTo` に変更前後のメールアドレスを保持する。
