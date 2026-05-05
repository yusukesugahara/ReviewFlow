# 画面構成

## 認証系
- /login
- /signup
- /invitations/accept

## tenant_admin
- /admin … ダッシュボード兼ハブ。**使用状況**（申請件数、平均差し戻し数、再申請（再提出）件数など）をテナント管理者向けに表示する。顧客の管理者が自組織の運用状況を把握するための画面。
- /admin/members … メンバー一覧。**テナント管理者がユーザーを招待**する（メール送信または招待リンク発行など、手段は実装で決定）。
- /admin/form-definitions
- /admin/form-definitions/[id]
- /admin/approval-flows
- /admin/applications
- /admin/applications/[id]
- /admin/export-jobs
- /admin/audit-logs

## tenant_user
- /app
- /app/applications
- /app/applications/new
- /app/applications/[id]
- /app/applications/[id]/edit

## tenant_user
- /review
- /review/applications
- /review/applications/[id]

## UI方針
- フォームは FormField 定義に従って動的描画する
- returned 状態の申請編集画面では、修正対象項目のみ活性化する
- 修正コメントは該当フィールド直下に表示する

## フォルダ責務
- `src/app`: ルーティング層。`page.tsx` / `layout.tsx` / Route Handler を配置し、業務ロジックは持たせない
- `src/features`: 機能単位の実装層。UI コンポーネントと機能ロジックを同居させる
- `src/features/*/components`: 画面や機能に紐づくコンポーネント
- `src/features/*/model`: ステータス判定・遷移ルート計算などの機能ロジック
- `src/components/ui`: 機能非依存の再利用 UI
- `src/lib`: API クライアント、サーバー呼び出し、定数、汎用ユーティリティなど横断基盤

## データ取得方針
- ページ単位で必要データを取得
- フォーム編集画面では以下を取得:
  - application
  - formDefinition
  - formFields
  - corrections

## フロントロジック
### 動的フォームレンダリング
field_type ごとにコンポーネントを分ける。

### 編集可能判定
```ts
const editable =
  application.status === "draft" ||
  (application.status === "returned" && correctionFieldIds.includes(field.id));
```
