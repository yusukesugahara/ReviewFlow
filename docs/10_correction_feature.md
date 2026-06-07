# 修正依頼付き差し戻し機能

## 目的
承認者が差し戻し時に、修正が必要なフォーム項目だけを指定できるようにする。申請者はその項目だけ再編集できる。

## 解決する課題
- 差し戻し内容が曖昧
- 全項目を再編集させてしまう
- 不要な変更が混ざる
- 修正箇所の確認に時間がかかる

## 業務ルール
- 差し戻し時は修正対象フィールドを1つ以上指定必須
- 各修正対象フィールドにコメントを付けられる
- returned 状態では修正対象フィールドのみ編集可能
- 修正対象外フィールドは readOnly
- resubmit 時に correction_request は resolved になる

## API要件
### POST /applications/:id/return
- correction_request 作成
- correction_request_items 作成
- application.status = returned

### GET /applications/:id/correction-targets
- 修正フォーム用: **最新の open** `correction_request` と、対象フィールドのメタ＋**現在値**（`currentValue`）を返す（無ければ `openCorrection: null`）

### GET /applications/:id/corrections
- 差し戻し**履歴**（複数 correction の一覧）

### POST /applications/:id/resubmit
- 必須修正項目を満たしていれば再提出
- correction_request.status = resolved
- application.status = in_review（`current_step_order = 1` に戻す）

## UI要件
共通の見た目、コンポーネント、状態表示、アクセシビリティのルールは [UIデザインルール](14_ui_design_rules.md) に従う。

### 承認者画面
- 各フィールドに「修正対象にする」チェック
- 項目別コメント入力
- 全体コメント入力

### 申請者画面
- 修正対象のみ入力可能
- コメント表示
- 非対象は readOnly

## 実装メモ
- correction_request は差し戻しイベント単位
- correction_request_items は項目単位
- 最新 open correction_request をベースに編集制御する
