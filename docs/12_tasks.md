# タスクメモ

このファイルは初期実装計画と進捗メモであり、現在の仕様の一次情報ではない。仕様判断では `docs/01_business_requirements.md`、`docs/04_api_spec.md`、`docs/08_auth_and_multitenant.md`、`docs/09_workflow_and_approval.md` を優先する。

## 現状の改善候補

- [ ] API 仕様、GraphQL / Relay operation、REST 参照 schema の差分確認手順を追加する
- [ ] フロントエンド E2E（申請〜承認〜差し戻し）を拡充する
- [ ] `ApprovalFlowSelector` を画面に統合する
- [ ] ファイル添付フィールドを追加する
- [ ] 承認フローの分岐条件を検討する
- [ ] 本番デプロイ構成を整備する

# Phase 1: 基盤
- [x] Next.js / NestJS / PostgreSQL / Docker Compose を初期構築する
- [x] TypeORM を導入する
- [x] Swagger を設定する
- [x] 認証基盤を実装する
- [x] JWT に tenantId / role を含める

# Phase 2: テナント / ユーザー
- [x] tenants テーブルを実装する
- [x] users テーブルを実装する
- [x] 招待機能を実装する（**tenant_admin** が自テナントのユーザーを招待できること）
- [x] ロール管理を実装する
- [x] サインアップ（テナント自動作成）を実装する
- [x] パスワードリセットを実装する
- [x] ログイン中ユーザーのプロフィール・メールアドレス・パスワード変更を実装する

# Phase 3: フォーム定義
- [x] form_definitions を実装する
- [x] form_fields を実装する
- [x] フォーム作成APIを実装する
- [x] フォーム公開APIを実装する

# Phase 4: 承認フロー
- [x] approval_flows を実装する
- [x] approval_steps を実装する
- [x] 承認フロー作成APIを実装する

# Phase 5: 申請
- [x] applications を実装する
- [x] application_field_values を実装する
- [x] 申請作成APIを実装する
- [x] 下書き更新APIを実装する
- [x] 提出APIを実装する
- [x] 一覧 / 詳細APIを実装する

# Phase 6: 承認 / 差し戻し
- [x] application_approvals を実装する
- [x] 承認APIを実装する
- [x] 差し戻しAPIを実装する
- [x] 却下APIを実装する
- [x] 再提出APIを実装する

# Phase 7: 修正依頼
- [x] correction_requests を実装する
- [x] correction_request_items を実装する
- [x] 修正対象取得APIを実装する
- [x] returned 時のフィールド単位編集制御を実装する

# Phase 8: CSV
- [x] export_jobs を実装する
- [x] CSVジョブ作成APIを実装する
- [x] ジョブ状態確認APIを実装する
- [x] ダウンロードAPIを実装する

# Phase 9: 監査ログ
- [x] audit_logs を実装する
- [x] 重要操作時にログ記録する
- [x] ログ一覧APIを実装する
- [x] 申請操作、招待、ユーザー操作、スペース操作、スペースメンバー操作を業務監査ログとして記録する
- [x] 監査ログ一覧にページネーションを実装する

# Phase 10: Frontend
- [x] `/space` を既定スペースの申請フォーム一覧へ接続する
- [x] ログイン / サインアップ画面を実装する
- [x] パスワードリセット画面を実装する
- [x] 招待受諾画面を実装する
- [x] フォーム作成画面を実装する
- [x] 承認フロー作成画面を実装する
- [x] 申請作成画面を実装する
- [x] 申請一覧画面を実装する
- [x] 承認画面を実装する
- [x] 差し戻し画面を実装する
- [x] returned 時の修正UIを実装する
- [x] CSVジョブ画面を実装する
- [x] 監査ログ画面を実装する
- [x] アカウント詳細画面とプロフィール・メールアドレス・パスワード変更モーダルを実装する
- [x] フロントエンド Jest テストを実装する
- [ ] フロントエンド E2E を業務フロー全体まで拡充する
