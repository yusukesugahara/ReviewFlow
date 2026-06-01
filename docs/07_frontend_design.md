# 画面構成

## 認証系
- /login
- /signup
- /invitations/accept
- /apply/access
- /apply/form
- /apply/correction

## tenant_admin
- /admin … /admin/spaces へリダイレクトする管理エントリポイント
- /admin/spaces
- /admin/invitations
- /admin/audit-logs

## tenant_user
- /space
- /space/[spaceId]/applications
- /space/[spaceId]/applications/new
- /space/[spaceId]/applications/[applicationId]
- /space/[spaceId]/applications/[applicationId]/edit
- /space/[spaceId]/submissions
- /space/[spaceId]/submissions/[applicationId]
- /space/application-setup
- /space/users

CSV出力はテナント管理ではなく、スペース配下の申請一覧 `/space/[spaceId]/submissions` の「すべての申請」右上にあるCSV出力ボタンから実行する。ボタン押下後のモーダルで申請フォームを選択し、CSV作成を開始する。

`/space/application-setup` は申請フォーム定義と承認フロー定義を作成する入口として扱う。申請者が提出する個別申請の作成は `/space/[spaceId]/applications/new` に寄せる。

## UI方針
- フォームは FormField 定義に従って動的描画する
- returned 状態の申請編集画面では、修正対象項目のみ活性化する
- 差し戻しメールから開く `/apply/correction` は、申請時と同じ動的フォームUIで修正対象項目のみ表示する
- 申請詳細画面では、returned かつ open correction がある場合に差し戻しメールを再送できる
- 修正コメントは該当フィールド直下に表示する

## フォルダ責務
- `src/app`: ルーティング層。`page.tsx` / `layout.tsx` / `actions.ts` とルート配下の `_components` を配置する
- `src/app/**/_components`: 画面やルートに紐づくコンポーネント。複数ルートで使うものは `src/app/_components` に置く
- `src/components/ui`: 機能非依存の再利用 UI
- `src/lib`: fetch の共通ベース、定数、汎用ユーティリティなど横断基盤

`src/app/api` は置かない。バックエンド呼び出しはサーバー側の `page.tsx` / `actions.ts` から行い、`INTERNAL_API_KEY` はブラウザへ露出させない。

## データ取得方針
- ページ単位で必要データを取得
- バックエンド API 呼び出しは server component / server action / server-only helper に寄せる
- ブラウザへ `INTERNAL_API_KEY`、JWT、HttpOnly cookie の値を渡さない
- API レスポンスは OpenAPI 生成型または型付き wrapper で扱い、画面ごとの ad hoc な `unknown` パースを増やさない
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

この判定は UX のための表示制御であり、セキュリティ境界ではない。`returned` 時の更新可能フィールド制限、申請者本人判定、承認者判定はバックエンドでも必ず検証する。
