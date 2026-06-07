# 認証
- メールアドレス + パスワード
- JWT ベース

## JWT payload
```json
{
  "sub": "user_1",
  "tenantId": "tenant_1",
  "role": "tenant_admin"
}
```

## マルチテナント方針
- 共有テーブル + tenant_id 方式
- クライアントから送られた tenant_id は信頼しない
- ログインユーザーの tenantId を唯一の基準にする

## APIガード方針
- `InternalApiKeyGuard`（グローバル、`X-API-Key`。`/health`, `/ready` は除外）
- `JwtAuthGuard`（グローバル、Passport JWT）
- `RolesGuard`（`@Roles` デコレータ）
- `ApplicantAccessGuard`（公開申請者 API、`X-Applicant-Access-Token`）
- テナントスコープは JWT の `tenantId` と Repository クエリで強制する（専用の `TenantScopeGuard` クラスはない）
- スペース権限は JWT の `role` だけで判定せず、対象 `groupId` の `group_members.role` を参照する。ユーザーはスペースごとに異なるロールを持てる。`SpaceAccessService` がスペース単位の認可を担当する

## 権限境界
| 権限 | 判定元 | 主な許可操作 |
| --- | --- | --- |
| テナント管理者 | `users.role = tenant_admin` | 自テナントのユーザー招待・復活・削除、スペース管理、監査ログ確認、テナント内スペースの業務データ管理 |
| スペース管理者 | `group_members.role = admin` | 自スペースのフォーム定義、承認フロー、申請一覧、CSV出力、スペースメンバー削除 |
| スペースユーザー | `group_members.role = user` | 自スペースでの申請作成、自分の申請閲覧、割り当てられた承認操作、申請詳細表示に必要なフォーム定義参照 |
| 申請者 | `applications.applicant_user_id` | 自分の下書き編集、提出、差し戻し項目の修正、再提出 |
| 承認者 | 現在ステップの `approval_steps.assignee_user_ids` | 担当ステップの承認、差し戻し、却下 |

申請者・承認者はテナントロールではなく、申請レコードと承認ステップの割り当てで決まる。`tenant_user` であっても、ある申請では申請者、別の申請では承認者になり得る。

## 重要ルール
- すべての業務テーブルに tenant_id を持たせる
- 一覧 / 詳細 / 更新 / 削除のすべてで tenant_id 条件を必須にする
- JOIN先テーブルも tenant_id 整合性を前提に扱う
- `groupId` を受け取る API では、対象 group が認証ユーザーの tenant に属することを先に検証する
- tenant_admin 以外の space 操作では、対象 `groupId` の `group_members` を参照して所属とロールを検証する
- 既存 JWT の `tenantId` / `role` は認可判断の入口に使うが、削除済みユーザーやロール変更後の状態はDBの現在値で検証する

## 招待
- **テナント管理者（tenant_admin）** が、自テナント内の **ユーザーを招待** できる（メール・付与ロールの指定など）。
- **テナント管理者（tenant_admin）** が、自テナント内のユーザーを削除・復活できる。削除は論理削除（`is_active = false`）で、削除済みユーザーはログインおよび既存 JWT での認証が不可。復活すると `is_active = true` に戻り、通常の認証が可能になる。
- 招待レコード・受諾処理はいずれも **JWT の tenantId** に紐づくテナント範囲に閉じ、他テナントへ横断できないこと。

## 禁止事項
- URL や body の tenant_id をそのまま使用しない
- フロントのロール出し分けだけで認可完結としない
