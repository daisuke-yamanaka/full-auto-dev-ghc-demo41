---
name: impl-backend
description: バックエンド実装工程を実行（Spring Boot実装・レビュー・PR作成）
---

`.claude/rules/implementation-backend.md` の指示に従い、バックエンド実装工程を実行してください。

## 実行手順

1. 設計書（`docs/design/design.md`）とAPI仕様書（`docs/design/openapi.yaml`）を読み込む
2. `feature/implementation` ブランチで `src/backend/` にSpring Boot APIを実装する
   - openapi.yamlの全エンドポイントリストを作成し、担当割り当てを明確化する
   - git worktreeを使って複数サブエージェントが並行でモジュールを実装する
   - 各機能実装後に `/simplify` と `/checkstyle` を実行して指摘を修正する
3. 別サブエージェント（git worktree使用）でレビューを実施する
   - openapi.yamlとの整合性確認（エンドポイント網羅性の逆引き確認必須）
   - 完了前必須チェックリスト（ログ・例外処理・セキュリティ等）を実施
4. 指摘事項を修正し、指摘がなくなるまで再レビューを繰り返す
5. `feature/implementation` → `develop` へのPRを作成する

## 注意事項

- フロントエンドとの並行実装は禁止（バックエンド完了後にフロントエンド着手）
- openapi.yamlに未定義のエンドポイントは追加禁止
- レビュー結果はPRのdescriptionに記載する
