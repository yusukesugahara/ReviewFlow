# Phase 1: 基盤
- [ ] Next.js / NestJS / MySQL / Docker Compose を初期構築する
- [ ] TypeORM を導入する
- [ ] Swagger を設定する
- [ ] 認証基盤を実装する
- [ ] JWT に tenantId / role を含める

# Phase 2: テナント / ユーザー
- [ ] tenants テーブルを実装する
- [ ] users テーブルを実装する
- [ ] 招待機能を実装する（**tenant_admin** が自テナントのユーザーを招待できること）
- [ ] ロール管理を実装する

# Phase 3: フォーム定義
- [ ] form_templates を実装する
- [ ] form_fields を実装する
- [ ] フォーム作成APIを実装する
- [ ] フォーム公開APIを実装する

# Phase 4: 承認フロー
- [ ] approval_flows を実装する
- [ ] approval_steps を実装する
- [ ] 承認フロー作成APIを実装する

# Phase 5: 申請
- [ ] applications を実装する
- [ ] application_field_values を実装する
- [ ] 申請作成APIを実装する
- [ ] 下書き更新APIを実装する
- [ ] 提出APIを実装する
- [ ] 一覧 / 詳細APIを実装する

# Phase 6: 承認 / 差し戻し
- [ ] application_approvals を実装する
- [ ] 承認APIを実装する
- [ ] 差し戻しAPIを実装する
- [ ] 却下APIを実装する
- [ ] 再提出APIを実装する

# Phase 7: 修正依頼
- [ ] correction_requests を実装する
- [ ] correction_request_items を実装する
- [ ] 修正対象取得APIを実装する
- [ ] returned 時のフィールド単位編集制御を実装する

# Phase 8: CSV
- [ ] export_jobs を実装する
- [ ] CSVジョブ作成APIを実装する
- [ ] ジョブ状態確認APIを実装する
- [ ] ダウンロードAPIを実装する

# Phase 9: 監査ログ
- [ ] audit_logs を実装する
- [ ] 重要操作時にログ記録する
- [ ] ログ一覧APIを実装する

# Phase 10: Frontend
- [x] テナント向け管理画面（使用状況: 申請件数・平均差し戻し数・再申請数など）を実装する
- [x] ログイン画面を実装する
- [ ] 招待受諾画面を実装する
- [ ] フォーム作成画面を実装する
- [ ] 承認フロー作成画面を実装する
- [ ] 申請作成画面を実装する
- [x] 申請一覧画面を実装する
- [x] 承認画面を実装する
- [x] 差し戻し画面を実装する
- [x] returned 時の修正UIを実装する
- [x] CSVジョブ画面を実装する
- [x] 監査ログ画面を実装する
