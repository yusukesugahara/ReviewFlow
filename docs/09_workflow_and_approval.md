# 申請ステータス
- draft
- submitted
- in_review
- returned
- approved
- rejected

## 基本フロー
1. applicant が申請作成
2. draft 保存
3. submit で submitted
4. 承認処理開始で in_review
5. 承認 or 差し戻し or 却下
6. 最終承認で approved

## 承認フロー制約
- 直列承認のみ
- 1フォームに対して1有効フロー
- ステップは step_order で順序管理
- approver_role に応じて承認可能者を判断

## 承認ロジック
- 中間承認: 次ステップに進める
- 最終承認: approved
- 差し戻し: returned + correction_request 作成
- 却下: rejected

## approver 権限判定
- 自分のロールが current step の approver_role と一致すること
- tenant_id が一致すること
