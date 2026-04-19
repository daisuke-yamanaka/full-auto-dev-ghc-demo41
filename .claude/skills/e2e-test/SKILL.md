---
name: e2e-test
description: E2Eテスト工程を実行（仕様書作成・E2E実装・レビュー・PR作成）
---

`.claude/rules/e2e-test.md` の指示に従い、E2Eテスト工程を実行してください。

## 実行手順

1. 要件定義書（`docs/requirements/`）と実装コード（`src/`）を読み込む
2. `feature/e2e-test` ブランチを作成し、先にテスト仕様書を作成する
   - `docs/test-spec/e2e/e2e-test-spec.md`（TC-ID・FR-ID・テスト条件・期待結果・テスト種別含む）
3. テスト仕様書に基づいてPlaywright E2Eテストを実装する
   - `src/e2e/` にテストコードを配置する
   - Playwright設定：screenshot=「on」、playwright-reportを出力
   - 全FR-IDをカバーする
   - 複数ロール連携・ステータス遷移・上限制約・複合業務フローシナリオを含める
4. 別サブエージェント（git worktree使用）でレビューを実施する
   - 全FR-IDカバレッジの確認
   - 禁止アサーションパターンの確認
   - 権限制御テストの確認
5. 指摘事項を修正し、指摘がなくなるまで再レビューを繰り返す
6. `feature/e2e-test` → `develop` へのPRを作成する
7. `/sonar-scan` → `/sonar-report` を実行して最終品質チェックを行う

## 注意事項

- テストコード実装前に必ずテスト仕様書を作成する
- 実装コードを必ず読み込んでからテストを作成する
- テストエビデンス（スクリーンショット・レポート）を残す
- レビュー結果はPRのdescriptionに記載する
