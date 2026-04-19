---
name: mockup
description: モック作成工程を実行（HTML作成・レビュー・PR作成・人間確認依頼）
---

`.claude/rules/mockup.md` の指示に従い、モック作成工程を実行してください。

## 実行手順

1. 事前にモックファイルが提示されている場合は、そのモックを承認済みモックとして扱い、このスキルの処理をスキップして設計工程に進む旨を報告する
2. `feature/mockup` ブランチを作成し、`docs/mockup/` に全3パターンのHTMLモックを作成する
   - `docs/mockup/pattern-a/`：ダッシュボード集約型＋サイドバーナビ
   - `docs/mockup/pattern-b/`：ダッシュボードなし＋トップバーナビ
   - `docs/mockup/pattern-c/`：タイルホーム型＋カード＆タイルナビ
   - `docs/mockup/README.md`：各パターンの特徴・コンセプト説明
3. 別サブエージェント（git worktree使用）でレビューを実施する
4. 指摘事項を修正し、指摘がなくなるまで再レビューを繰り返す
5. `feature/mockup` → `develop` へのPRを作成する
6. **作業を停止し、人間にモック確認を依頼する**

## 注意事項

- PRを作成したら必ず作業を停止して人間の確認を待つ
- 人間の承認なしに設計以降に進んではいけない
- レビュー結果はPRのdescriptionに記載する
