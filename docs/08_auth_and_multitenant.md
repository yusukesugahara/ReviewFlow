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

## 禁止事項
- URL や body の tenant_id をそのまま使用しない
- フロントのロール出し分けだけで認可完結としない
