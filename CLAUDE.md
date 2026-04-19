## 技術スタック
- Spring Boot REST API（バックエンド）
- Doma3（O/Rマッパー）
- React（SPA フロントエンド）
- Axios（HTTPクライアント）

## 開発フロー

```
要件定義 → モック作成 → 設計 → 実装 → ユニットテスト → E2Eテスト
```

**モック承認まで設計以降に進んではいけません。**

## ディレクトリ構成

| 工程 | ディレクトリ |
|------|------------|
| 要件定義 | `docs/requirements/` |
| モック作成 | `docs/mockup/` |
| 設計 | `docs/design/` |
| 実装（バックエンド） | `src/backend/` |
| 実装（フロントエンド） | `src/frontend/` |
| 単体テスト仕様書作成 | `docs/test-spec/unit/` |
| 単体テストコード作成（バックエンド） | `src/backend/src/test/` |
| 単体テストコード作成（フロントエンド） | `src/frontend/**/__tests__/` |
| E2Eテスト仕様書作成 | `docs/test-spec/e2e/` |
| E2Eテストコード作成（E2E） | `src/e2e/` |

## ブランチ戦略

- `main`：リリース可能な状態を維持する保護ブランチ
- `develop`：各工程のPRをマージする統合ブランチ
- 工程別フィーチャーブランチ：`feature/<工程名>`（例：`feature/requirements`、`feature/mockup` 等）

## エージェント役割分担方針

- **サブエージェントで役割を分担**して、効率よく作業を進める。
- 成果物（計画・要件・設計・コードなど）は常に**別のサブエージェントがレビュー**する。
- レビューエージェントは `git worktree` で独立した作業ディレクトリを使用する。
- `git worktree` を活用して、複数のサブエージェントが並行して異なるブランチで作業できるようにする。

## 工程別 rules ファイル

各工程は `.claude/rules/<工程>.md` の指示に従って作業する。

| 工程 | rules ファイル | パススコープ |
|------|--------------|------------|
| 要件定義 | `.claude/rules/requirements.md` | `docs/requirements/**/*` |
| モック作成 | `.claude/rules/mockup.md` | `docs/mockup/**/*` |
| 設計 | `.claude/rules/design.md` | `docs/design/**/*` |
| 実装（バックエンド） | `.claude/rules/implementation-backend.md` | `src/backend/**/*` |
| 実装（フロントエンド） | `.claude/rules/implementation-frontend.md` | `src/frontend/**/*` |
| 単体テスト | `.claude/rules/unit-test.md` | `docs/test-spec/unit/**/*`, `src/backend/src/test/**/*`, `src/frontend/**/__tests__/**/*` |
| E2Eテスト | `.claude/rules/e2e-test.md` | `docs/test-spec/e2e/**/*`, `src/e2e/**/*` |

## 各工程の進捗状況

| 工程 | ステータス | ブランチ | PR | 備考 |
|------|----------|---------|-----|------|
| 要件定義 | 完了 | `feature/requirements` | PR #1（マージ済み） |  |
| モック作成 | 完了 | `feature/mockup` | PR #3（マージ済み） | パターンB採用 |
| 設計 | 完了 | `feature/design` | PR #4（マージ済み） |  |
| 実装（バックエンド） | 完了 | `feature/implementation-backend` | PR #5（マージ済み） | 全23エンドポイント実装済み |
| 実装（フロントエンド） | 完了 | `feature/implementation-frontend` | PR #6（マージ済み） | 全15画面実装済み |
| 単体テスト | 未実施 | `feature/unit-test` |  |  |
| E2Eテスト | 未実施 | `feature/e2e-test` |  |  |

## 採用モックデザイン方針（基本設計以降に反映すること）

**採用パターン：パターンB（ドロワーメニュー型 ＋ Material Designインスパイア）**

| 項目 | 内容 |
|------|------|
| ナビゲーション | ハンバーガーアイコン起動のドロワーメニュー（オーバーレイ）。PCではピン留めで常時表示に切り替え可能 |
| ログイン後の遷移先 | アクティビティフィード画面（最新の貸出・返却・予約をタイムライン表示） |
| 配色 | 背景 `#ffffff`/`#f8f9fa`、プライマリ `#1a73e8`（Googleブルー）、アクセント `#00897b`（ティール） |
| カードUI | カード型UIで情報をグループ化、シャドウ＋余白で階層を表現（フラットデザイン＋エレベーション） |
| 通知 | バッジ＋スナックバー（下部）で非侵入的に表示 |
| レスポンシブ | PC(≥1024px)・タブレット・スマホ全対応。モバイルではドロワーがスライドイン |
| localStorage | ドロワーのピン留め状態は `localStorage` で画面遷移間も維持 |

## 重要ルール

- タスクが中断しても適切に継続できるよう、重要な情報は本ファイル（CLAUDE.md）に記録する。
- 各工程のドキュメントは全て md ファイルで作成して残す。
- 各テストではエビデンスを残す。
- 各工程の完了時に必ず PR を作成し、PR の CI チェック（テスト・ビルド）をパスしてからマージする。
- コミットメッセージは `[工程名] 作業内容の概要` の形式で統一する（例：`[impl] ユーザ認証機能を実装`）。
