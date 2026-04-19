---
name: unit-test
description: 単体テスト工程を実行（仕様書作成・テストコード実装・レビュー・PR作成）
---

`.claude/rules/unit-test.md` の指示に従い、単体テスト工程を実行してください。

## 実行手順

1. 詳細設計書（`docs/detailed-design/`）と実装コード（`src/`）を読み込む
2. `feature/unit-test` ブランチを作成し、先にテスト仕様書を作成する
   - `docs/test-spec/unit/unit-test-spec.md`（TC-ID・FR-ID・テスト条件・期待結果・テスト種別含む）
3. テスト仕様書に基づいてテストコードを実装する
   - バックエンド：`src/backend/src/test/`（境界値分析・同値分析、全Daoテスト含む）
   - フロントエンド：`src/frontend/src/`（Jest + React Testing Library）
   - カバレッジ90%以上を達成する
4. 別サブエージェント（git worktree使用）でレビューを実施する
   - テスト仕様書の存在確認
   - ArgumentCaptorによる具体的なフィールド値検証の確認
   - カバレッジ確認
5. 指摘事項を修正し、指摘がなくなるまで再レビューを繰り返す
6. `feature/unit-test` → `develop` へのPRを作成する

## 注意事項

- テストコード実装前に必ずテスト仕様書を作成する（仕様書なしの実装禁止）
- テストエビデンスを残す
- レビュー結果はPRのdescriptionに記載する
