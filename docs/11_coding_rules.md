# 全体ルール
- TypeScript strict 前提
- any 禁止
- 暗黙的な型変換に依存しない
- 命名は一貫させる

## Backend
- DTO を必ず作る
- class-validator を使う
- Controller にロジックを書かない
- Service 単位でユースケースを完結させる
- 例外は NestJS の HttpException 系で明示する
- tenant_id 条件漏れを防ぐため、取得系処理を共通化する

## Frontend
- フォームスキーマは Zod で表現する
- APIレスポンス型を明示する
- 画面コンポーネントとフォームロジックを分ける
- field_type ごとの描画コンポーネントを分離する

## Git / タスク
- 1タスク1PR 相当で進める
- コミットメッセージは目的がわかる形にする
- 生成コードのレビュー前提で進める
