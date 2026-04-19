---
description: 単体テスト工程のルール（docs/test-spec/unit/**/*、src/backend/src/test/**/*、src/frontend/**/__tests__/**/* に適用）
paths: [docs/test-spec/unit/**/*, src/backend/src/test/**/*, src/frontend/**/__tests__/**/*]
---

# 単体テスト工程 rules

## 工程開始チェック
- 要件定義書、モック、設計書、実装（バックエンド）、実装（フロントエンド）が全て揃っていない場合、作業を中断して。

## 単体テスト
- **テスト仕様書（`docs/test-spec/unit/unit-test-spec.md`）を必ず作成してから、テストコードの実装を開始して。テスト仕様書にテスト成績（合否・実施結果）の記載は不要。**
- **テストコードの配置先**：バックエンドは `src/backend/src/test/`以下、フロントエンドは `src/frontend/src/` 以下に配置して。
- 単体テストでは境界値分析と同値分析を行って。
- 単体テストのコード・カバレッジが90%以上になるまで、検査NGとする。
- 単体テストでは詳細設計を満たしているか検査します。
- 単体テストのモック検証では、メソッド呼び出しの確認だけでなく、引数の具体的な内容（フィールド値）を検証して。「呼ばれたこと」だけを確認する形式的アサーションを禁止します。
- データアクセス層（Repository/Mapper/DAO等）の単体テスト（またはインメモリDBを使った統合テスト）を必ず作成して。CRUD操作・動的クエリ・ページネーション等の正当性を検証すること。
- グローバル例外ハンドラーのテストを必ず作成して。各例外に対して正しいHTTPステータスコードとレスポンス形式が返されることを検証すること。
- モック検証で `verify(mock).method(any(Entity.class))` のみの形式的アサーションを禁止します。必ず `ArgumentCaptor<Entity>` でキャプチャし、`assertThat(captured.getField()).isEqualTo(expected)` で引数の具体的なフィールド値を検証してください。または `argThat` ラムダで内容を検証してください。
- **プロジェクト内の全 Doma3 Dao インターフェース**に対してテストを作成してください。テストを作成する Dao を選別せず、CRUD操作・動的SQL・ページネーションを含む全 Dao を対象とすること。`@SpringBootTest` でインメモリDB（H2）を使用してください。
- `GlobalExceptionHandler` のテストを必ず作成してください。`@WebMvcTest` でMockMvcを使い、各例外クラスに対するHTTPステータスコードとJSONレスポンス形式を検証すること。
- テストカバレッジは全体で **90%以上** を目標としてください。カバレッジが低い場合はService層・Mapper層を優先して補強してください。
- **全統合テストクラスに `@Transactional` を付与してください。** GETリクエストのみのテストクラスも例外なく対象です。

## テスト仕様書の作成（必須）
- 単体テスト・結合テスト・システムテスト（E2E）のすべてのテスト工程で、**テストコード実装前に**最低限のテスト仕様書をmdファイルとして作成して。テスト仕様書が存在しない状態でテストコードを実装することを禁止します。
- テスト仕様書に**テスト成績（テスト実施結果・合否記録）の記載は不要**。仕様書はテストの設計情報のみを記載する。
- テスト仕様書・テストコードの保存先と対応工程：
  - 単体テスト：仕様書 `docs/test-spec/unit/unit-test-spec.md`、テストコード `src/backend/src/test/`・`src/frontend/src/`（`feature/unit-test`ブランチ）
- 各テスト仕様書には以下の項目を最低限含めて：
  - テスト対象の機能・クラス・エンドポイント
  - テストケースID（TC-xxx）と対応するFR-ID
  - テスト条件（前提条件・入力データ）
  - 期待結果（具体的な検証項目）
  - テスト種別（正常系/異常系/境界値）
- テスト仕様書は各テスト工程のフィーチャーブランチにコミットし、PRの成果物として含めて。テスト仕様書が含まれていないPRはレビューNGとする。

## レビュー方針
- レビュー指摘は後で人間が確認するので、記録として残して。
- レビューの結果で品質がOKになるまで、次の工程を実行しないで。
- レビューでは別の新たなサブエージェントを使い、役割を分担してレビューして。
- レビューエージェントはgit worktreeで独立した作業ディレクトリを使用して。
- レビュー指摘が誤っていないか、指摘対象のコードを確認して、ファクトチェックして。
- レビュー指摘が重複していたら取り除いて。
- レビュー指摘が誤っていたら、指摘を取り下げて。
- レビュー指摘を修正したら、次の工程に進まないで、再レビューを実施し、修正すべき指摘がなくなるまで、レビューを繰り返して。
- 再レビューでは別の新たなサブエージェントを使い、レビューの役割を分担して。
- 重要な指摘だけでなく、必ず軽微な指摘でも処置して。
- レビュー結果はPRのdescriptionに以下の形式で記載して。mdファイルへの別途記録は不要です。
  ```
  ## レビュー結果
  | 指摘番号 | 重要度 | 指摘内容 | 対応結果 |
  |---------|--------|---------|---------|
  | R-001   | 重要   | ...     | 修正済み |
  ```
- レビュー完了後、フィーチャーブランチからPRを作成して。

## 完了前必須チェックリスト（単体テスト工程）

### テスト仕様書・テストコードの確認
- `docs/test-spec/unit/unit-test-spec.md` が存在すること
- テスト仕様書にテスト対象・TC-ID・FR-ID・テスト条件・期待結果・テスト種別が記載されていること
- バックエンドのテストコードが `src/backend/src/test/` に存在すること
- フロントエンドのテストコードが `src/frontend/src/` に存在すること
- **テスト仕様書が存在しない場合、単体テストレビューはNG**

### 単体テスト品質の確認
```bash
grep -rn "verify.*any(.*class)" src/test/java/ --include="*.java"
```
- `verify(mock).method(any(Entity.class))` のみで引数内容を検証していないテストが存在しないこと
- 各verifyの近くに `ArgumentCaptor` または `argThat` による具体的なフィールド値検証があること
- **形式的なverifyのみのテストが発見された場合、テストレビューはNG**

### Doma3 Dao テストの確認
```bash
grep -rn "@SpringBootTest\|@Dao" src/test/java/ --include="*.java"
```
- 全 Doma3 Dao インターフェースに対応するテストクラスが `src/test/java/` に存在すること
- 各 Dao テストが `@SpringBootTest` + H2 インメモリDBを使用していること
- CRUD操作・動的SQL・ページネーション等を網羅したテストケースが含まれていること
- **未実装の Dao テストが発見された場合、テストレビューはNG**

### 統合テストの@Transactional確認
```bash
grep -rLn "@Transactional" src/test/java/*IntegrationTest.java src/test/java/**/*IntegrationTest.java 2>/dev/null
```
- 全統合テストクラスに `@Transactional` が付与されていること
- **`@Transactional` が付与されていない統合テストクラスが発見された場合、テストレビューはNG**

### Reactフロントエンドテストの確認
```bash
find frontend/src -name "*.test.tsx" -o -name "*.test.ts" -o -name "*.spec.tsx" -o -name "*.spec.ts" 2>/dev/null | sort
```
- 全ページコンポーネントに対応するテストファイルが存在すること
- **テストファイルが存在しないページコンポーネントが発見された場合、テストレビューはNG**

```bash
grep -rn "jest.mock.*axios\|axios.*mock" frontend/src/ --include="*.test.*" --include="*.spec.*" 2>/dev/null
```
- API通信を含むテストで `axios` がモック化されていること
- **実際のHTTPリクエストを発行しているテストが発見された場合、テストレビューはNG**

Reactテストカバレッジの確認：
```bash
cd frontend && npx jest --coverage --coverageReporters=text-summary 2>/dev/null | tail -5
```
- テストカバレッジが **90%以上** であること
- **90%未満の場合、テストレビューはNG（ページコンポーネント・カスタムフックを優先して補強すること）**

## GitHubワークフロー方針
- issueは使用しません。
- ブランチ戦略は以下の通りとする。
  - `main`ブランチ：リリース可能な状態を維持する保護ブランチ
  - `develop`ブランチ：各工程のPRをマージする統合ブランチ
  - 工程別フィーチャーブランチ：`feature/<工程名>`の命名規則で作成（例：`feature/requirements`、`feature/mockup`、`feature/basic-design`、`feature/detailed-design`、`feature/implementation`、`feature/unit-test`、`feature/integration-test`、`feature/system-test`）
- 各工程の作業開始時に、`develop`ブランチから対応する`feature/<工程名>`ブランチを作成して。
- 各工程の作業終了時に、`develop`ブランチへマージして。
- 各工程の成果物（mdファイル・コード等）は必ずフィーチャーブランチにコミットして。
- レビューが完了したら、`feature/<工程名>`ブランチから`develop`ブランチへのPRを`gh pr create`で作成して。
- PRの説明には、工程名・主な成果物・レビュー結果サマリを記載して。
- PRのマージは`gh pr merge --squash`で行い、フィーチャーブランチは削除して。
- 全工程完了後、`develop`から`main`へのPRを作成してマージして。
- git worktreeを活用して、複数のサブエージェントが並行して異なるブランチで作業できるようにして。
  - worktreeの作成：`git worktree add <path> <branch>`
  - worktreeの削除：`git worktree remove <path>`
  - レビューエージェントは専用のworktreeで独立して作業して。

