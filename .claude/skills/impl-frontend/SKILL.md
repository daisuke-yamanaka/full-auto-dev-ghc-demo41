---
name: impl-frontend
description: フロントエンド実装工程を実行（React実装・レビュー・PR作成）
---

`.claude/rules/implementation-frontend.md` の指示に従い、フロントエンド実装工程を実行してください。

## 実行手順

1. 設計書（`docs/design/design.md`）とAPI仕様書（`docs/basic-design/openapi.yaml`）を読み込む
2. バックエンドAPIの動作確認が完了していることを確認する
3. `feature/implementation` ブランチで `src/frontend/` にReact SPAを実装する
   - git worktreeを使って複数サブエージェントが並行でモジュールを実装する
   - 各機能実装後に `/simplify` と `/eslint` を実行して指摘を修正する
   - openapi.yamlを参照してAxios呼び出しを実装する（ハードコーディング禁止）
4. 別サブエージェント（git worktree使用）でレビューを実施する
   - openapi.yamlとの整合性確認
   - テストカバレッジ90%以上の確認
   - 完了前必須チェックリストを実施
5. 指摘事項を修正し、指摘がなくなるまで再レビューを繰り返す
6. `feature/implementation` → `develop` へのPRを作成する

## 注意事項

- バックエンド実装・動作確認完了後に着手する
- 全ページコンポーネントのテスト（Jest + React Testing Library）を作成する
- レビュー結果はPRのdescriptionに記載する
