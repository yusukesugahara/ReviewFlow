# Codex プロンプト例

Codex / AI エージェントに依頼するときは、まず `.agents/skills/reviewflow-portfolio/SKILL.md` を読ませる。

共通で守ること:

- ReviewFlow を単なる CRUD ではなく、申請・承認・差し戻し・再提出を扱う業務ワークフローとして扱う
- backend authorization、`tenantId` scoping、`groupId` scoping、application status transition、current approval step、audit log を確認する
- Controller、Service、Policy、Validator、Workflow、Repository の責務を分ける
- API 契約を変える場合は Swagger / OpenAPI と frontend generated types を更新する
- 重要な業務ルールはテストしやすい module に置く

# Prompt 1: TypeORM Entity / migration 作成

`docs/00_overview.md`, `docs/02_domain_model.md`, `docs/03_er_diagram.md` を読んでください。
TypeORM を使って ReviewFlow の初期 Entity（および migration）を実装してください。
制約:
- 全業務テーブルに tenant_id を持たせる
- enum は仕様に従う
- unique / index を仕様どおり入れる
- relation を明示する
- コメントで各モデルの役割を書く

# Prompt 2: NestJS Applications module 実装
`docs/04_api_spec.md`, `docs/06_backend_design.md`, `docs/08_auth_and_multitenant.md`, `docs/09_workflow_and_approval.md`, `docs/10_correction_feature.md` を読んでください。
NestJS で applications module を実装してください。
対象:
- POST /applications
- PATCH /applications/:id
- POST /applications/:id/submit
- GET /applications
- GET /applications/:id
制約:
- DTO を作る
- validation を入れる
- tenant_id を JWT から取得する
- tenant_user は自分の申請、または現在承認ステップに割り当てられた申請だけ扱える
- space 業務データは `tenantId` と `groupId` で scope する
- returned 状態では correction_request_items 対象フィールドのみ編集可能にする
- 不正な状態遷移を拒否する
- 重要操作は audit_log に記録する

# Prompt 3: 差し戻し機能実装
`docs/10_correction_feature.md` を主仕様として読み、NestJS で差し戻し関連APIを実装してください。
対象:
- POST /applications/:id/return
- GET /applications/:id/corrections
- POST /applications/:id/resubmit
制約:
- correction_request_items は1件以上必須
- form_field_id がその application の form_definition に属することを検証する
- resubmit 時に correction_request.status を resolved にする
- audit_log を記録する
- application.status が returned 以外の resubmit を拒否する
- 修正対象外フィールドの変更を backend で拒否する

# Prompt 4: Next.js 動的フォーム実装
`docs/07_frontend_design.md`, `docs/10_correction_feature.md`, `docs/14_ui_design_rules.md` を読み、Next.js App Router で動的フォーム描画を実装してください。
制約:
- field_type ごとにコンポーネントを分離する
- `draft` / `published` の場合は全項目編集可
- returned の場合は correction 対象のみ編集可
- correction コメントを各項目直下に表示する
- React Hook Form と Zod でフォーム状態・バリデーションを扱う
- API 通信では OpenAPI 生成型を優先する
- loading / error / empty state を考慮する
- UI の編集可否は UX 制御として実装し、backend 側の検証を前提にする

# Prompt 5: README / docs 改善

`.agents/skills/reviewflow-portfolio/SKILL.md`, `docs/00_overview.md`, `docs/05_architecture.md`, `docs/09_workflow_and_approval.md`, `docs/11_coding_rules.md` を読んでください。
ReviewFlow の README または docs を、ポートフォリオとして伝わりやすい内容に改善してください。

制約:
- 単なる CRUD ではなく、申請・承認・差し戻し・再提出・監査ログを扱う業務フローとして説明する
- tenant / space 分離、backend authorization、状態遷移管理、OpenAPI 型連携を評価軸として含める
- 実装で守るべきルールと参考情報を混ぜない
- 現行実装と異なる説明を追加しない
