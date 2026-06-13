# 画面構成

## 認証系
- /login
- /signup
- /forgot-password
- /password-reset
- /invitations/accept
- /account/email-change/confirm … メールアドレス変更確認
- /logout
- /apply/[groupId] … 公開申請アクセス要求
- /apply/access … 申請者トークンを HttpOnly クッキーに設定
- /apply/form
- /apply/correction

## tenant_admin
- /admin … `/admin/spaces` へリダイレクトする管理エントリポイント
- /admin/spaces … スペース CRUD・メンバー管理
- /admin/invitations … テナントユーザー招待・ユーザー一覧・削除/復活
- /admin/audit-logs … 監査ログ一覧
- /admin/export-jobs … `/admin/spaces` へリダイレクト（CSV は submissions 側へ移行）

## tenant_user / tenant_admin 共通
- /account … ログイン中アカウントの詳細、プロフィール編集、メールアドレス変更、パスワード変更
- /space … **使用状況ダッシュボード**（スペース横断の申請件数・平均差し戻し数・再提出件数）
- /space/[spaceId] … `/space/[spaceId]/applications` へリダイレクトするスペース入口
- /space/[spaceId]/applications
- /space/[spaceId]/applications/new
- /space/[spaceId]/applications/[applicationId]
- /space/[spaceId]/applications/[applicationId]/edit
- /space/[spaceId]/submissions
- /space/[spaceId]/submissions/[applicationId]
- /space/application-setup
- /space/users

CSV出力はテナント管理ではなく、スペース配下の申請一覧 `/space/[spaceId]/submissions` の「すべての申請」右上にあるCSV出力ボタンから実行する。ボタン押下後のモーダルで申請フォームを選択し、CSV作成を開始する。

申請一覧のサマリーカードは一覧フィルタとして動作する。「対応が必要」は `in_review` / `returned` の申請を表示し、「直近7日間に対応」は `approved` / `rejected` かつ更新日時が直近7日以内の申請を表示する。

`/space/application-setup` は申請フォーム定義と承認フロー定義を作成・編集する入口として扱う。画面は 1 つの大きなカードにフォーム名、フォーム入力画面、承認フロー設定をまとめ、下書き保存と公開ボタンはカード右上に配置する。申請者が提出する個別申請の作成は `/space/[spaceId]/applications/new` に寄せる。

`/admin/invitations` はユーザー一覧を主画面とし、右上のユーザー追加アイコンから「新しい招待を送信」モーダルを開く。モーダルは背景クリックまたは閉じる操作で閉じる。

`/admin/spaces` は各スペースをカードとして表示し、スペース名・説明文の編集はカード右上の編集アイコンからモーダルで行う。メンバー追加・招待はスペース詳細内のメンバー管理操作から開く。

`/admin/audit-logs` は監査ログの見出し説明を簡素にし、検索・対象種別・日付条件に加えてページネーションで履歴を確認する。

`/account` はアカウント詳細カードだけを表示する。右上の縦三点アクションから、プロフィール編集、メールアドレス編集、パスワード変更の各モーダルを開く。メールアドレス編集は即時変更ではなく確認メール送信を開始する。

## UI方針
ビジュアルデザイン、shadcn/ui の使い方、Tailwind のトークン、ボタン・テーブル・状態表示・アクセシビリティの詳細ルールは [UIデザインルール](14_ui_design_rules.md) に集約する。

この文書では、画面構成と業務フローに関わる UI 方針だけを扱う。

- フォームは FormField 定義に従って動的描画する
- returned 状態の申請編集画面では、修正対象項目のみ活性化する
- 差し戻しメールから開く `/apply/correction` は、申請時と同じ動的フォームUIで修正対象項目のみ表示する
- 申請詳細画面では、returned かつ open correction がある場合に差し戻しメールを再送できる
- 修正コメントは該当フィールド直下に表示する

## フォルダ責務
- `src/app`: ルーティング層。`page.tsx` / `layout.tsx` / `actions.ts` とルート配下の `_components` を配置する
- `src/app/**/_components`: 画面やルートに紐づくコンポーネント。複数ルートで使うものは `src/app/_components` に置く
- `src/app/**/_data`: ルート単位のデータ取得・ページデータ組み立て
- `src/app/**/_utils`: ルート単位の表示整形、検索条件、payload 変換など
- `src/app/**/_view-models`: 画面表示用モデルへの変換
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
field_type ごとにコンポーネントを分ける。入力値を保存する項目（text, textarea, number, date, select, radio, checkbox, consent）と、表示専用項目（description, section）を区別する。

### 編集可能判定
```ts
const editable =
  application.status === "draft" ||
  application.status === "published" ||
  (application.status === "returned" && correctionFieldIds.includes(field.id));
```

この判定は UX のための表示制御であり、セキュリティ境界ではない。`returned` 時の更新可能フィールド制限、申請者本人判定、承認者判定はバックエンドでも必ず検証する。
