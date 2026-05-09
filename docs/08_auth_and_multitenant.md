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
- JwtAuthGuard
- RolesGuard
- TenantScopeGuard 相当の共通処理

## 重要ルール
- すべての業務テーブルに tenant_id を持たせる
- 一覧 / 詳細 / 更新 / 削除のすべてで tenant_id 条件を必須にする
- JOIN先テーブルも tenant_id 整合性を前提に扱う

## 招待
- **テナント管理者（tenant_admin）** が、自テナント内の **ユーザーを招待** できる（メール・付与ロールの指定など）。
- **テナント管理者（tenant_admin）** が、自テナント内のユーザーを削除・復活できる。削除は論理削除（`is_active = false`）で、削除済みユーザーはログインおよび既存 JWT での認証が不可。復活すると `is_active = true` に戻り、通常の認証が可能になる。
- 招待レコード・受諾処理はいずれも **JWT の tenantId** に紐づくテナント範囲に閉じ、他テナントへ横断できないこと。

## 禁止事項
- URL や body の tenant_id をそのまま使用しない
- フロントのロール出し分けだけで認可完結としない
