---
name: requirements
description: 要件定義工程を実行（作成・レビュー・PR作成）
---

`.claude/rules/requirements.md` の指示に従い、要件定義工程を実行してください。

## 実行手順

1. `docs/requirements/` に要件定義書を作成する（`feature/requirements` ブランチで作業）
2. 別サブエージェント（git worktree使用）でレビューを実施する
3. 指摘事項を修正し、指摘がなくなるまで再レビューを繰り返す
4. `feature/requirements` → `develop` へのPRを作成する

## 注意事項

- ヒアリングシートが提示されている場合はそれを読み込んでから作業を開始する
- ヒアリングシートがない場合は人間に場所を確認する
- レビューエージェントは必ず別の新たなサブエージェントを使用する
- レビュー結果はPRのdescriptionに記載する（mdファイルへの別途記録不要）
- **モック作成工程に進まない**（本スキルは要件定義工程のみ）
