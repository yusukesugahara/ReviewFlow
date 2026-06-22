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
- `src/lib`: Relay client、共有 DTO 型、定数、汎用ユーティリティなど横断基盤

`src/app/api` は置かない。バックエンド呼び出しはサーバー側の `page.tsx` / `actions.ts` から行い、`INTERNAL_API_KEY` はブラウザへ露出させない。

## データ取得方針
- ページ単位で必要データを取得
- バックエンド API 呼び出しは server component / server action / server-only helper に寄せる
- ブラウザへ `INTERNAL_API_KEY`、JWT、HttpOnly cookie の値を渡さない
- API レスポンスは Relay operation helper または共有 DTO 型付き wrapper で扱い、画面ごとの ad hoc な `unknown` パースを増やさない
- フォーム編集画面では以下を取得:
  - application
  - formDefinition
  - formFields
  - corrections

## フロントロジック
### 動的フォームレンダリング
field_type ごとにコンポーネントを分ける。入力値を保存する項目（text, textarea, number, date, select, radio, checkbox, consent）と、表示専用項目（description, section）を区別する。

### 編集可能判定
申請詳細画面の操作ボタンは backend の `ApplicationDetailDto.capabilities` を表示制御として使う。frontend は未入力項目の案内や returned 項目の活性/非活性など UX 補助だけを行い、申請者本人判定、承認者判定、space 管理者判定、状態遷移可否は backend の policy / service で検証する。

## テスト戦略

フロントエンドのテスト戦略は、既存の `apps/frontend/__test__` と `apps/frontend/e2e` の役割分担を基準にする。Jest は画面部品、ページ表示、入力・変換 helper、Server Action 周辺を小さく検証し、Playwright は実際のユーザー操作と API 境界を通した主要業務フローを検証する。

backend が権限・状態遷移・監査ログの正とし、frontend のテストは表示制御、入力体験、API呼び出しの組み立て、ユーザー操作としての到達性を確認する。権限や状態遷移が重要な箇所では、UI の表示だけでなく E2E から直接APIの失敗も確認する。

### レイヤー別の役割

| レイヤー | 主な目的 | 実行コマンド |
| --- | --- | --- |
| 型・契約チェック | TypeScript 型、Relay operation、共有 DTO 型の破綻を早期に検出する | `npm run typecheck -w frontend`、`npm run relay:validate -w frontend` |
| Jest | `__test__/components`、`__test__/pages`、`__test__/utils`、`__test__/actions` で frontend 固有ロジックを狭く検証する | `npm run test -w frontend` |
| Playwright E2E | `e2e/*.spec.ts` で認証、公開申請、承認フロー、管理機能、境界条件を実ブラウザとAPIで検証する | `npm run test:e2e -w frontend` |
| build / Storybook | Next.js build 時の破綻と、共有 UI・ワークフロー UI の表示確認を行う | `npm run build -w frontend`、`npm run storybook:build -w frontend` |

### 既存 Jest の守備範囲

Jest は「ブラウザ全体で通すほどではないが、壊れると画面品質に直結する frontend の判断」を守る。

| 配置 | 代表例 | 守る内容 |
| --- | --- | --- |
| `__test__/components` | `approval-progress-diagram`、`reviewer-application-actions`、`applicant-application-actions`、`approval-steps-builder`、`dynamic-field-renderers`、`submission-csv-export-controls` | UI部品の表示、操作可否、確認ダイアログ、申請ステップ表示、動的フォーム部品 |
| `__test__/pages` | `login-view`、`public-application-form-view`、`public-correction-view`、`space-submissions-page-content`、`admin-invitations-view` | ページ単位の初期表示、空状態、エラー表示、主要導線 |
| `__test__/utils` | `dynamic-field-validation`、`application-capabilities`、`approval-progress-helpers`、`application-status-rules`、`graphql-applications`、`api-envelope` | 入力 validation、表示用状態判定、API response 変換、GraphQL helper、日付/ステータス整形 |
| `__test__/actions` | `login-actions`、`application-setup-actions` | Server Action の入力検証、API payload、失敗時の戻り値 |

新しい UI ロジックを追加するときは、既存の分類に合わせて置く。画面表示だけなら `pages`、再利用部品なら `components`、業務判断や変換は `utils`、Server Action は `actions` に寄せる。

### 既存 E2E の守備範囲

Playwright は、ユーザー操作と backend API を組み合わせて、壊れると業務上影響が大きい流れを守る。

| spec | 守る内容 |
| --- | --- |
| `auth-cookie.spec.ts` | ログイン後の HttpOnly cookie とセッション境界 |
| `public-application-workflow.spec.ts` | 公開フォーム申請、申請詳細での承認、差し戻し、修正再提出、監査ログ |
| `public-application-field-types.spec.ts` | 公開申請フォームの主要フィールド型 |
| `applicant-access-boundaries.spec.ts` | 申請者 token と公開申請アクセス境界 |
| `application-form-setup.spec.ts` | 申請フォーム作成、フィールド設定、確認/承認ステップ設定 |
| `application-workflow-guards.spec.ts` | 承認済みなど終端状態に対する再承認・却下・差し戻し不可 |
| `authorization-boundaries.spec.ts` | tenant / space をまたぐ直接APIアクセス不可 |
| `submission-csv-export.spec.ts` | 申請一覧からの CSV export |
| `admin-invitations.spec.ts`、`admin-space-management.spec.ts`、`space-user-management.spec.ts`、`admin-audit-logs.spec.ts` | 管理画面の主要操作 |
| `account-settings.spec.ts`、`demo-seed.spec.ts` | アカウント設定とデモデータの基本導線 |

E2E は `e2e/helpers` からテストデータを作る。既存データに依存せず、テストごとに一意のメールアドレス、フォーム名、スペース名を使う。

### 重点的に守る画面・操作

- 認証/セッション: ログイン、ログアウト、未認証リダイレクト、HttpOnly cookie、アカウント設定。
- 申請フォーム設定: 動的フィールド、確認/承認ステップ、グループ確認/承認、公開済みフォーム編集時の制約。
- 公開申請: applicant access token、各フィールド型の入力、申請送信、差し戻し修正、再提出。
- 申請詳細/承認: 現在ステップ表示、操作ボタンの表示制御、承認、確認、差し戻し、却下、完了ステータス。
- 境界チェック: tenant / space をまたいだ閲覧・操作不可、直接URLアクセス、直接APIアクセス。
- 管理機能: スペース管理、招待、ユーザー管理、監査ログ、CSV出力。

### 変更内容ごとの判断基準

| 変更内容 | 最低限の確認 | 追加で必要になりやすい確認 |
| --- | --- | --- |
| 表示だけの軽微なUI変更 | `npm run typecheck -w frontend` | 共有 UI なら Storybook、重要画面なら対象 E2E の目視/実行 |
| 入力 validation / mapper / 表示判定 | `npm run typecheck -w frontend`、対象 Jest | 業務フローに影響する場合は Playwright |
| Server Action / API wrapper | `npm run typecheck -w frontend`、対象 Jest | 認証・権限・状態遷移に関わる場合は Playwright |
| Relay / API 契約変更 | backend schema 更新、Relay 生成/検証、`npm run typecheck -w frontend` | 画面データが変わる主要フローの Playwright |
| 認証、cookie、公開申請 token | `npm run typecheck -w frontend` | Playwright の auth / public application 系 |
| 承認フロー、差し戻し、再提出 | `npm run typecheck -w frontend` | Playwright の workflow 系 |

### Jest の方針

Jest ではブラウザ全体の操作ではなく、壊れやすい frontend 固有ロジックを狭く検証する。既存テストと同じく Testing Library でユーザーから見える role / label / text を優先し、実装詳細の className や内部 state には寄せない。

- dynamic form の値変換、未入力判定、表示専用フィールドの扱い。
- 申請詳細の表示用 view model、ステータス文言、現在ステップの表示整形。
- Server Action や API helper が backend に渡す payload の形。
- backend の権限判定そのものは Jest で再実装しない。frontend 側は `capabilities` や API response に基づく表示制御だけを確認する。

### Playwright E2E の方針

Playwright は、ユーザーにとって重要な一連の操作と境界条件を検証する。詳細な実行方法と環境変数は `apps/frontend/e2e/README.md` を参照する。

- テストデータは E2E helper から API 経由で作成し、既存のローカルデータに依存しない。
- メールアドレス、フォーム名、スペース名などはテストごとに一意にする。
- UI でボタンが非表示になることだけを権限テストの根拠にしない。権限境界が重要な変更では、直接APIまたは直接URLアクセスの失敗も確認する。
- 画面レイアウトだけの pixel-perfect な検証は増やさない。スクロールせずに操作できること、主要情報が欠けないことなど、業務上意味のある表示条件を検証する。
- 新しい主要フローを追加した場合は、正常系を 1 本作り、権限または状態不一致の失敗系を必要最小限で追加する。

### テスト追加の基準

- 新しい component を追加し、表示分岐、操作、disabled 条件、ダイアログがある場合は `__test__/components` に追加する。
- 新しい page view を追加し、空状態、エラー状態、権限による表示差分、主要リンクがある場合は `__test__/pages` に追加する。
- API response の整形、動的フォーム値、ステータス、capability、日付、URL 生成を変更する場合は `__test__/utils` に追加する。
- Server Action の入力、payload、エラー変換を変更する場合は `__test__/actions` に追加する。
- 認証、公開申請、承認フロー、差し戻し、CSV、管理画面、tenant / space 境界に関わる場合は、対応する `e2e/*.spec.ts` を更新する。
- 既存 E2E の helper で表現できない setup が必要になった場合は、spec 内に重複させず `e2e/helpers` に寄せる。

### 実行順の目安

普段の実装では、まず型チェックと対象 Jest を実行し、API契約や画面遷移を触った場合に Playwright を追加する。PR 前や大きめのUI変更では build まで確認する。

```bash
npm run typecheck -w frontend
npm run test -w frontend
npm run build -w frontend
E2E_API_URL=http://127.0.0.1:3000 npm run test:e2e -w frontend
```
