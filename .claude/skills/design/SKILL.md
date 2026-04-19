---
name: design
description: 基本設計工程を実行（設計書・OpenAPI作成・レビュー・PR作成）
---

`.claude/rules/design.md` の指示に従い、設計工程を実行してください。

## 実行手順

1. 承認済みモック（`docs/mockup/`）と要件定義書（`docs/requirements/`）を読み込む
2. `feature/design` ブランチを作成し、`docs/design/` に設計書を作成する
3. 別サブエージェント（git worktree使用）でレビューを実施する
   - 要件定義の充足確認
   - モックとの整合性チェック
4. 指摘事項を修正し、指摘がなくなるまで再レビューを繰り返す
5. `feature/design` → `develop` へのPRを作成する

## 注意事項

- モック承認が完了していることを確認してから着手する（人間に確認する）
- OpenAPI仕様は必ず`docs/design/openapi.yaml`として作成する
- レビュー結果はPRのdescriptionに記載する
