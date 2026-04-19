---
description: 実装（バックエンド）工程のルール（src/backend/**/* に適用）
paths: src/backend/**/*
---

# 実装（バックエンド）工程 rules

## 工程開始チェック
- 要件定義書、モック、設計書が全て揃っていない場合、作業を中断して。

## 実装方針
- 実装はgit worktreeを使って、複数のサブエージェントが並行して異なるモジュールを実装して。ただし、バックエンドとフロントエンドの並行実装は禁止する。バックエンドAPIの実装・動作確認を完了してからフロントエンドの実装を開始すること。バックエンド内の複数モジュール間、またはフロントエンド内の複数モジュール間の並行実装は可。
- コミットメッセージは「[工程名] 作業内容の概要」の形式で統一して（例：`[impl] ユーザ認証機能を実装`）。
- 各工程の完了時に必ずPRを作成し、PRのCIチェック（テスト・ビルド）をパスしてからマージして。
- レビューによってコード修正した場合、関連する設計書を修正すること。ただし、ヒアリングシートと要件定義書の変更は禁止。

### API仕様の実装遵守（必須）
- バックエンド・フロントエンドの実装時は、設計工程で確定した `docs/design/openapi.yaml`（OpenAPI仕様書）を必ず参照し、APIの契約として厳格に遵守すること。
- エンドポイントURL・HTTPメソッド・パスパラメータ・クエリパラメータ・リクエストボディのフィールド名と型・レスポンスのJSON構造は、すべて openapi.yaml の定義に正確に従うこと。独自解釈による実装を禁止する。
- openapi.yaml に定義されていないAPIエンドポイントを独自に追加してはいけない。追加が必要な場合は、まず openapi.yaml を更新し、バックエンド・フロントエンド双方の実装に反映すること。
- **エンドポイント網羅性の確保**：バックエンド実装開始時に、openapi.yaml に定義された全エンドポイントのリストを作成し、各エンドポイントの実装担当（どのサブエージェント/モジュールが担当するか）を明確に割り当てること。実装完了時に全エンドポイントが実装済みであることをリストで突合確認すること。
- **実装順序**：バックエンド（API提供側）を先に実装し、APIエンドポイントの動作確認を完了してから、フロントエンド（API消費側）の実装を開始すること。これにより、フロントエンドは実際に動作するAPIに合わせて実装でき、API不整合を防止する。
- フロントエンドのAPI呼び出し（URL・HTTPメソッド・リクエスト/レスポンスの型定義）は、openapi.yaml から生成またはopenapi.yamlを見ながら実装し、ハードコーディングによる齟齬を防ぐこと。

- 各機能を実装するたびに、スキル「/simplify」とスキル「/checkstyle」を実行して、指摘事項を修正してから、実装レビューを行って。

### ログ実装（必須）
- 全Serviceクラスに `@Slf4j` アノテーション（Lombokを使用する場合）または `LoggerFactory.getLogger()` でLoggerを定義してください。
- 以下の操作は必ず `log.info()` で操作ログを出力してください。
  - ログイン成功・失敗（CustomUserDetailsService等）
  - 主要なビジネス操作（登録・更新・削除・ステータス変更等）
  - ユーザ・リソースの登録・更新・削除（管理者操作を含む）
- **操作ログには必ず操作者のユーザIDと対象リソースIDを含めてください。** 「誰が・何に対して・何をしたか」の3要素が揃って初めて監査ログとして機能します。Service層では `SecurityContextHolder.getContext().getAuthentication().getName()` で操作者を取得し、対象リソースID（entityId・userId等、対象システムに応じた名称）と合わせてログに出力してください。例：`log.info("リソース操作: entityId={}, operator={}", entityId, operator)`
- **Service層の `log.info()` 呼び出しには操作者IDを直接含めて。** MDC等の間接的な方法だけに頼らず、ログメッセージ文字列自体に操作者IDを埋め込むこと（例：`log.info("userId={} が操作を実行: targetId={}", userId, targetId)`）。
- 例外キャッチ箇所では必ず `log.error(message, e)` でスタックトレース付きエラーログを出力してください。
- `application.properties`（またはapplication.yml）にログレベル設定を記載してください。

### 例外処理（必須）
- `@RestControllerAdvice` アノテーションを付与したグローバル例外ハンドラークラス（GlobalExceptionHandler等）を必ず作成してください。
- カスタム例外クラスのcatchは各Controllerに散在させず、GlobalExceptionHandlerに集約してください。
- レスポンスは常にJSON形式で返却してください（REST APIのため、HTMLレスポンスは不要です）。
- DB制約違反は `DataIntegrityViolationException` でキャッチしてください。汎用 `Exception` をキャッチして `e.getMessage().contains("UNIQUE")` 等の文字列マッチで判定することを禁止します。
- ビジネスロジック上の例外（業務ルール違反・リソース不整合等）は `IllegalStateException` や `IllegalArgumentException` などの標準Javaクラスを直接スローせず、必ずアプリケーション固有のカスタム例外クラスを定義して使用してください。

### DRY原則の徹底
- 同一ロジックの重複を排除し、共通処理はヘルパーメソッドやユーティリティクラスに抽出して。
- 特に以下のパターンは必ず共通化すること：
  - エンティティから表示用の値を取得・変換する処理が複数箇所に存在する場合はヘルパーメソッドとして抽出すること
  - レスポンスDTOの生成処理が複数箇所に存在する場合は、ファクトリメソッドまたは共通変換メソッドに集約すること
- **同一ロジックが3箇所以上に重複している場合、実装レビューはNG**

### 定数管理
- ビジネスルールの数値（各種上限値・期限日数等）をマジックナンバーとして直接コードに記述することを禁止します。定数（`static final` フィールドまたは設定値）として定義してください。
- 同一の文字列リテラルが複数箇所（目安として3回以上）に繰り返し登場する場合は、定数として定義して参照してください。URLパス・Viewテンプレート名・モデル属性名・ロール文字列・テスト用フィクスチャ値等が対象です。

### セキュリティ実装（必須）
- React（SPA）からのリクエストを受け付けるため、`SecurityConfig` に CORS 設定を明示的に行ってください。許可するオリジン・メソッド・ヘッダーを明示し、`allowedOrigins("*")` のようなワイルドカード設定は本番環境では禁止します。
- REST API のため CSRF 保護は無効化（`csrf().disable()`）してください。ただし、その旨をコメントで明記し、代替のセキュリティ対策（JWT等のトークン認証）を実装してください。
- セッションタイムアウト設定は `SecurityConfig` 内で明示的に行ってください。
- `SecurityConfig` の `sessionManagement` に `.maximumSessions(1)` を設定し、同一アカウントの多重ログインを防止してください。
- `sessionManagement` に `sessionFixation().migrateSession()`（または同等の設定）を明示的に追加し、セッション固定攻撃対策を実装してください。
- `application-prod.yml` のDB接続パスワードは `${DB_PASSWORD}` としてください（`${DB_PASSWORD:}` のように空文字デフォルトを設定しないこと）。
- 開発・デモ用であってもアカウントIDやパスワードをソースコードにハードコードしないでください。機密情報漏洩リスクとなります。

### 環境設定管理（必須）
- `application.properties` を単一ファイルのみで管理することを禁止します。Springプロファイルを使用して以下のように分離してください。
  - `application.yml`（または `application.properties`）：共通設定のみ
  - `application-dev.yml`（または `application-dev.properties`）：H2コンソール有効化、デバッグログ等の開発専用設定
  - `application-prod.yml`（または `application-prod.properties`）：本番DB設定、INFOログ、H2コンソール無効等
- `spring.h2.console.enabled=true` は必ず開発プロファイルにのみ記載し、共通設定や本番設定に含めないでください。
- 環境切り替えは `SPRING_PROFILES_ACTIVE` 環境変数で制御できるようにし、コメントアウトによる手動変更は不可とします。
- `spring.profiles.active` に `:dev` のようなデフォルト値（フォールバック）を設定しないでください。環境変数が未設定の場合はアプリケーション起動が失敗するようにし、誤ったプロファイルで本番起動することを防いでください。

### トランザクション管理（必須）
- 更新系メソッドには `@Transactional` を付与してください。
- **読み取り専用メソッド**（検索・取得・一覧表示等）には `@Transactional(readOnly = true)` を必ず付与してください。対象例：`searchBooks`、`getBookDetail`、`getUsers`、`getLoanHistory`、`getUserReservations` 等。

### バリデーション実装（必須）
- DTOのバリデーションルールには `@NotBlank`/`@NotNull` だけでなく、`@Size`（文字数制約）や `@Pattern`（文字種制約）を全入力項目で定義してください。

## レビュー方針（実装）
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
- 実装レビューでは設計書との整合性を必ず確認して。特に以下の点を検査すること：
  - テンプレート/ビューのフォルダ名・エンドポイントパス（パスプレフィックス含む）が設計書と一致していること
  - クラス/モジュールの依存関係が設計書と一致していること
  - データ転送オブジェクト（DTO等）のフィールド構成が設計書と一致していること
  - 差異がある場合は設計書を実装に合わせて更新すること（ヒアリングシートと要件定義書は除く）
- 実装レビューでは `docs/design/openapi.yaml` との整合性を必ず確認して。特に以下の点を検査すること：
  - バックエンドの全エンドポイントURL・HTTPメソッドが openapi.yaml と一致していること
  - リクエストボディ・レスポンスのJSON構造（フィールド名・型・必須/任意）が openapi.yaml と一致していること
  - フロントエンドのAPI呼び出し先URL・HTTPメソッド・リクエスト/レスポンスの型定義が openapi.yaml と一致していること
  - パスパラメータ・クエリパラメータの名前と型が openapi.yaml と一致していること
  - **エンドポイント網羅性の逆引き確認**：openapi.yaml に定義された全エンドポイントを1つずつ確認し、対応するバックエンド実装（Controller/Handler）が存在することを検証すること。実装コード側からの確認だけでは「実装されなかったエンドポイント」を検出できないため、必ず openapi.yaml 側から逆引きで確認すること。
  - **上記のいずれかが未達成の場合、実装レビューはNG**
- 実装レビューでは以下のJava/Spring Boot固有の整合性を確認してください：
  - REST APIエンドポイントのパス・HTTPメソッド・リクエスト/レスポンス形式が設計書と一致していること
  - エンドポイントパスの `/api` プレフィックス有無が設計書と一致していること
  - Serviceクラスの `@RequiredArgsConstructor` で注入される依存クラスのリストが設計書と一致していること
  - DTO/Responseクラスのフィールド構成が設計書と一致していること（Reactが期待するJSONキー名と一致すること）
  - CORS 設定の許可オリジンがフロントエンド（React）の配信URLと一致していること
  - 差異がある場合は設計書を実装に合わせて更新すること

## 完了前必須チェックリスト（実装工程）

### ログ実装の確認
以下のコマンドで確認し、ログ実装状況を出力・記録してください：
```bash
grep -rn "@Slf4j\|LoggerFactory\|log\.info\|log\.error\|log\.warn" src/main/java/ --include="*.java"
```
- 全Serviceクラスに `@Slf4j` または `LoggerFactory.getLogger()` が存在すること
- ログイン成功・失敗のログが存在すること（CustomUserDetailsService等）
- 主要なビジネス操作（登録・更新・削除・承認・却下等、対象システムのコアユースケース）に `log.info()` が存在すること
- 例外キャッチ箇所に `log.error(message, e)` が存在すること
- **上記が一つでも未達成の場合、実装レビューはNG（このチェックをスキップしてはいけません）**

### @RestControllerAdvice の確認
```bash
grep -rn "@RestControllerAdvice\|@ControllerAdvice" src/main/java/ --include="*.java"
```
- `GlobalExceptionHandler` 等の `@RestControllerAdvice` クラスが存在すること
- JSON形式の例外ハンドリングが実装されていること
- **未実装の場合、実装レビューはNG**

### プロファイル分離の確認
```bash
ls src/main/resources/
```
- `application-dev.yml`（またはapplication-dev.properties）が存在すること
- `application-prod.yml`（またはapplication-prod.properties）が存在すること
- `spring.h2.console.enabled=true` が共通設定・本番設定ファイルに含まれていないこと
- `spring.profiles.active` に `:dev` 等のデフォルト値が設定されていないこと
- **未実装の場合、実装レビューはNG**

### 定数管理の確認
```bash
grep -rn "[^a-zA-Z][0-9]\+[^0-9a-zA-Z]" src/main/java/ --include="*.java"
```
- ビジネスルールの数値（上限件数・有効期限日数・ステータスコード等、対象システムのルールに応じた数値）が `static final` 定数または設定値として定義されていること
- マジックナンバーとしてコードに直接記述されていないこと
- **マジックナンバーが発見された場合、実装レビューはNG**

### セキュリティ実装の確認
```bash
grep -rn "maximumSessions\|sessionFixation\|csrf\|DB_PASSWORD\|CorsConfiguration\|corsConfigurationSource\|allowedOrigins" src/main/ --include="*.java" --include="*.yml"
```
- `SecurityConfig` に CORS 設定（`CorsConfiguration` または `corsConfigurationSource`）が実装されていること
- `SecurityConfig` に `csrf().disable()` が設定されていること（REST API のため）
- `SecurityConfig` に `.maximumSessions(1)` が設定されていること
- `SecurityConfig` に `sessionFixation()` が設定されていること
- `allowedOrigins("*")` が本番設定に使用されていないこと
- `application-prod.yml` の `DB_PASSWORD` にデフォルト値（`${DB_PASSWORD:}`のコロン以降）が設定されていないこと
- **上記が一つでも未達成の場合、実装レビューはNG**

### トランザクション管理の確認
```bash
grep -rn "@Transactional" src/main/java/ --include="*.java"
```
- 更新系メソッドに `@Transactional` が付与されていること
- 読み取り専用メソッド（search/get/find/list系）に `@Transactional(readOnly = true)` が付与されていること
- **読み取り専用メソッドに `readOnly = true` がない場合、実装レビューはNG**

### 例外処理の確認
```bash
grep -rn "catch.*Exception\|DataIntegrityViolationException\|getMessage.*contains\|IllegalStateException\|IllegalArgumentException" src/main/java/ --include="*.java"
```
- DB制約違反が `DataIntegrityViolationException` でキャッチされていること
- `catch (Exception e)` + `getMessage().contains("UNIQUE")` パターンが存在しないこと
- ビジネスロジック上の例外として `IllegalStateException` や `IllegalArgumentException` が業務用途で直接スローされていないこと（カスタム例外クラスを使用すること）
- **上記問題が発見された場合、実装レビューはNG**

### 操作ログの操作者ID・対象リソースID確認
```bash
grep -rn "log\.info.*操作\|log\.info.*更新\|log\.info.*作成\|log\.info.*削除\|log\.info.*登録" src/main/java/ --include="*.java"
```
- Service層の全操作ログに操作者ID（`SecurityContextHolder` 等から取得）が含まれていること
- 各操作ログに対象リソースID（entityId・userId等、対象システムに応じた名称）が含まれていること
- **操作者IDまたは対象リソースIDが欠落している操作ログが存在する場合、実装レビューはNG**

### API仕様整合性の確認
- バックエンドの全エンドポイント（URL・HTTPメソッド・リクエスト/レスポンス構造）が `docs/design/openapi.yaml` と一致していること
- openapi.yaml に定義されていない独自エンドポイントが追加されていないこと
- **エンドポイント網羅性**：openapi.yaml に定義された全エンドポイントを1つずつリストアップし、対応するバックエンドの実装（Controller/Handler）が存在することを確認すること。未実装のエンドポイントが1件でもあれば、実装完了を宣言してはいけない。
- **上記が一つでも未達成の場合、実装レビューはNG（このチェックをスキップしてはいけません）**

### フロントエンドが必要なフィールドの設計チェック
APIレスポンス DTO を設計・実装する際に以下を必ず確認すること：

- **楽観的ロック用 `version` の網羅**
  - フロントエンドから更新・削除操作が発生するリソースは、そのリソースの `version` をすべての関連レスポンス（一覧・詳細・ダッシュボード等の集約レスポンス）に含めること
  - ダッシュボード等の集約レスポンスで操作ボタンを表示する場合、操作対象エンティティの `version` を必ず含めること
  - **`version` が欠落している場合、実装レビューはNG**

- **ユーザー状態判定フィールドの網羅**
  - ログインユーザーの状態によって UI が変わる画面（リソース詳細等）では、フロントエンドが状態を判定するために必要な `currentUser*` 系フィールドをすべて定義すること
  - 対象フィールドの例：`currentUserResourceId`（操作対象リソースのID）、`currentUserResourceVersion`（楽観的ロック用バージョン）、`currentUserStatus`（現在の申請・処理状態）等、対象システムのリソース・状態に応じたフィールド名
  - フロントエンドの画面状態遷移表（SCR*.md）を参照し、各状態の判定に必要なフィールドをすべて openapi.yaml に定義すること
  - **判定に必要なフィールドが欠落している場合、実装レビューはNG**

- **ナビゲーション用 ID の網羅**
  - 一覧・集約画面のレスポンスで、リソース名等クリック時に詳細画面へ遷移する要素があれば、対応するリソース ID を必ず含めること
  - 画面設計書のアクション定義（SCR00X-A0N「〇〇リンク押下 → SCR00X へ遷移」）を参照し、ナビゲーション元の全レスポンスに遷移先 ID が含まれていることを確認すること
  - **ナビゲーション用 ID が欠落している場合、実装レビューはNG**

## GitHubワークフロー方針
- issueは使用しません。
- ブランチ戦略は以下の通りとする。
  - `main`ブランチ：リリース可能な状態を維持する保護ブランチ
  - `develop`ブランチ：各工程のPRをマージする統合ブランチ
  - 工程別フィーチャーブランチ：`feature/<工程名>`の命名規則で作成（例：`feature/requirements`、`feature/mockup`、`feature/design`、`feature/implementation`、`feature/unit-test`、`feature/integration-test`、`feature/system-test`）
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

## プロダクト最終品質チェック
- システムテストまで完了した後、実装後、スキル「/sonar-scan」を実行した後、スキル「/sonar-report」を実行して、レポートを確認して。
- sonar-reportの全ての指摘について、コードを修正し、デグレが発生していないか、回帰テストを実施して。
