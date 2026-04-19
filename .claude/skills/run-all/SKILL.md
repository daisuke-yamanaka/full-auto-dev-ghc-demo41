---
name: run-all
description: 全工程を順番に実行（途中からの継続可）
---

CLAUDE.md の「各工程の進捗状況」テーブルを確認し、未完了の工程から順に以下の各スキルを実行してください。

## 実行順序

1 `/requirements` — 要件定義
2. `/review-requirements` — 要件定義書レビュー
3. `/mockup` — モック作成（モックのパターンが未指定の場合、モック完成後、人間の承認を待って停止）
4. `/review-mockup` — モックレビュー
5. `/design` — 設計（モック承認済みの場合のみ着手）
6. `/review-design` — 設計書レビュー
7. `/impl-backend` — 実装（バックエンド）
8. `/review-impl-backend` — 実装（バックエンド）レビュー
9. `/impl-frontend` — 実装（フロントエンド）
10. `/review-impl-frontend` — 実装（フロントエンド）レビュー
11. `/unit-test` — 単体テスト
12. `/review-unit-test` — 単体テストレビュー
13. `/e2e-test` — E2Eテスト
14. `/review-e2e-test` — E2Eテストレビュー
15. `/sonar-scan` — SonarQubeによるSonarScan
16. `/sonar-report` — SonarScan結果レポートを生成（指摘事項があれば、すべての指摘を修正する）

## 継続ルール

- ステータスが「完了」の工程はスキップする
- ステータスが「進行中」の工程は、その工程のスキルを実行して完了させる
- モック作成完了後は人間の承認を待って必ず停止する（モックのパターンが未指定の場合）
- 各工程完了後、CLAUDE.md の進捗状況テーブルを「完了」に更新する
