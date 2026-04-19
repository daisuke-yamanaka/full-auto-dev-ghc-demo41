---
name: review-impl-backend
description: バックエンド実装の強化レビューを実施（複数視点・深掘り検査）
---

バックエンド実装コード（`src/backend/`）に対して強化レビューを実施してください。

## 強化レビューの実施手順

**3つの独立したレビューエージェント**を git worktree で並行起動し、それぞれ異なる視点でレビューを実施してください。

### エージェント1：OpenAPI整合性チェック

- `docs/design/openapi.yaml` の全エンドポイントを1件ずつ逆引きして対応する実装（Controller/Handler）が存在することを確認する
- URL パス・HTTP メソッド・リクエスト/レスポンス構造が openapi.yaml と一致しているか
- 以下のコマンドを実行してエビデンスを記録する：
  ```bash
  grep -rn "@Slf4j\|LoggerFactory\|log\.info\|log\.error" src/backend/src/main/java/ --include="*.java"
  grep -rn "@RestControllerAdvice\|@ControllerAdvice" src/backend/src/main/java/ --include="*.java"
  grep -rn "@Transactional" src/backend/src/main/java/ --include="*.java"
  grep -rn "maximumSessions\|sessionFixation\|csrf\|CorsConfiguration" src/backend/src/main/ --include="*.java" --include="*.yml"
  ```

### エージェント2：セキュリティ・設計品質チェック

- マジックナンバーがない（ビジネスルールの数値が定数・設定値として定義されているか）
- カスタム例外クラスを使用しているか（`IllegalStateException` 等の標準例外を業務用途で直接スローしていないか）
- DRY 原則：同一ロジックが3箇所以上に重複していないか
- セッション固定攻撃対策・多重ログイン防止が実装されているか
- プロファイル分離（dev/prod 等）が正しく実装されているか
- 操作ログに操作者 ID・対象リソース ID が含まれているか
- 読み取り専用メソッドに `@Transactional(readOnly = true)` が付与されているか

### エージェント3：フロントエンドが必要なフィールドのチェック

画面設計書（`docs/design/screens/SCR*.md`）と openapi.yaml を参照し、以下の3種類のフィールドがレスポンスに含まれているかを確認する：

- **楽観的ロック用 `version` の網羅**
  - フロントエンドから更新・削除操作が発生するリソースを含む全レスポンス（一覧・詳細・集約レスポンス等）に `version` フィールドが実装されているか
  - 集約レスポンス（ダッシュボード等）内に操作ボタンを表示する場合、操作対象エンティティの `version` が含まれているか

- **ユーザー状態判定フィールドの網羅**
  - ログインユーザーの状態によって UI が変わる画面のレスポンスに、画面状態遷移表の各状態を判定するために必要なフィールド（`currentUser*` 系）が実装されているか
  - openapi.yaml の定義と実装の DTO フィールドが一致しているか

- **ナビゲーション用 ID の網羅**
  - 画面設計書のナビゲーションアクション定義（「〇〇リンク押下 → SCR00X へ遷移」）を参照し、ナビゲーション元レスポンスに遷移先リソース ID が実装されているか

## 集約・修正フロー

1. 3エージェントの指摘を集約し、重複・誤りを除去する
2. 全指摘を修正する（軽微な指摘も必ず対処する）
3. 修正後、さらに**新たな2エージェント**で再レビューを実施する
4. 指摘がなくなるまで繰り返す
5. 最終的なレビュー結果をPRのdescriptionに記載する
