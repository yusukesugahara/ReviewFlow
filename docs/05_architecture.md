# 全体構成
- Next.js: 画面表示、フォーム入力、認証後UI
- NestJS: 認証、業務ロジック、認可、監査ログ、CSVジョブ管理
- MySQL: 永続化
- Worker 相当: CSV生成処理

## フロントエンド構成方針
- App Router を採用
- server component / client component を適切に分離
- API呼び出しは型安全なクライアントを用意
- 動的フォームは FormDefinition と FormField 定義から生成

## バックエンド構成方針
- NestJS module 単位に責務分離
- DTO + class-validator を利用
- TypeORM をデータアクセス層に使う
- 監査ログは重要操作のたびに明示的に記録

## 非同期処理方針
MVPでは簡易的に DB ベースの export_jobs を利用する。
- APIでジョブ作成
- ポーリングで状態確認
- 完了後にダウンロード
