# 申請ステータス
- draft
- submitted
- in_review
- returned
- approved
- rejected

## 基本フロー
1. テナントユーザーが申請作成
2. draft 保存
3. submit で submitted
4. 承認処理開始で in_review
5. 承認 or 差し戻し or 却下
6. 最終承認で approved

## 申請作成画面
- スペース配下の新規申請画面は、申請項目と承認ステップを入力して新しい申請を作成する入口である。
- 申請は毎回新規作成する。ユーザー向け画面ではフォーム定義を再利用・選択・編集する導線を持たない。
- 現行 DB/API では申請が内部的にフォーム定義を参照するため、作成時に申請ごとの一回限りの内部定義を生成する。
- フォーム定義画面と承認フロー画面は独立したナビゲーション項目としては持たず、新規申請画面に集約する。

## 承認フロー制約
- 直列承認のみ
- 1フォームに対して1有効フロー
- ステップは step_order で順序管理
- 現在ステップの assignee_user_ids に含まれるユーザーが承認可能。既存データ互換のため assignee_user_ids が未設定の場合は assignee_user_id を代表承認者として扱う。

## 承認ロジック
- 中間承認: 次ステップに進める
- 最終承認: approved
- 差し戻し: returned + correction_request 作成
- 却下: rejected

## 承認権限判定
- 自分のユーザーIDが current step の assignee_user_ids に含まれること
- tenant_id が一致すること
