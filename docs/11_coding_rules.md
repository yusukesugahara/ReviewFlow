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
- fetchはpages.tsxまたはactions.tsで行う
- viewはviewファイルを作り、pages.tsxにインポートして使う
- fetchはserverコンポーネントで行う
- typeは基本、schema.tsから、インポートして使う
- typeはtypes fileに書く
- `useEffect` は原則避ける。ポーリングやブラウザ API 連携など、Server Component で代替できない場合のみ使用する（例: CSV エクスポートのジョブ状態監視）
- 保守性を意識して書く
- 可読性を意識して書く

## Git / タスク
- 1タスク1PR 相当で進める
- **コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) に従う。**
  - 形式: `<type>[optional scope][!]: <description>`（subject は命令形・現在形・英語が望ましい）
  - よく使う `type` の例: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build`, `ci`
  - 破壊的変更がある場合は、subject に `!` を付けるか、本文に `BREAKING CHANGE:` で理由と移行手順を書く
  - 例: `feat(auth): add tenant-scoped login` / `fix(api): return 404 for missing application` / `docs: describe admin dashboard metrics`
- 生成コードのレビュー前提で進める
