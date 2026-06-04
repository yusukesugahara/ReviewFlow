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
- tenant_user は自分の申請しか扱えない
- returned 状態では correction_request_items 対象フィールドのみ編集可能にする

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

# Prompt 4: Next.js 動的フォーム実装
`docs/07_frontend_design.md`, `docs/10_correction_feature.md`, `docs/14_ui_design_rules.md` を読み、Next.js App Router で動的フォーム描画を実装してください。
制約:
- field_type ごとにコンポーネントを分離する
- draft の場合は全項目編集可
- returned の場合は correction 対象のみ編集可
- correction コメントを各項目直下に表示する
- React Hook Form + Zod を使う
