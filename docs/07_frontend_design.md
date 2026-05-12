# 画面構成

## 認証系
- /login
- /signup
- /invitations/accept

## tenant_admin
- /admin … /admin/spaces へリダイレクトする管理エントリポイント
- /admin/spaces
- /admin/invitations
- /admin/export-jobs
- /admin/audit-logs

## tenant_user
- /space
- /space/[spaceId]/applications
- /space/[spaceId]/applications/new
- /space/[spaceId]/applications/[applicationId]
- /space/[spaceId]/applications/[applicationId]/edit
- /space/application-setup
- /space/users

## UI方針
- フォームは FormField 定義に従って動的描画する
- returned 状態の申請編集画面では、修正対象項目のみ活性化する
- 修正コメントは該当フィールド直下に表示する

## フォルダ責務
- `src/app`: ルーティング層。`page.tsx` / `layout.tsx` / `actions.ts` とルート配下の `_components` を配置する
- `src/app/**/_components`: 画面やルートに紐づくコンポーネント。複数ルートで使うものは `src/app/_components` に置く
- `src/components/ui`: 機能非依存の再利用 UI
- `src/lib`: fetch の共通ベース、定数、汎用ユーティリティなど横断基盤

`src/app/api` は置かない。バックエンド呼び出しはサーバー側の `page.tsx` / `actions.ts` から行い、`INTERNAL_API_KEY` はブラウザへ露出させない。

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
