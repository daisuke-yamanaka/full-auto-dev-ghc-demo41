---
name: sonar-scan
description: SonarScannerを使用して指定フォルダのアプリをSonarQubeで診断する。「sonar」「SonarScanner」「SonarQube」「コード診断」「品質診断」などのキーワードで呼び出される。
allowed-tools: Bash, Read, Write, Glob
---

# SonarScanner スキャンスキル

指定されたフォルダに対してSonarScannerによるコード品質・セキュリティ診断を実行します。
SonarQubeサーバーへの接続情報は環境変数（`SONAR_HOST_URL`、`SONAR_TOKEN`）から取得します。

## 使い方

```
/sonar-scan [診断対象フォルダパス]
/sonar-scan [診断対象フォルダパス] --project-key <プロジェクトキー>
/sonar-scan [診断対象フォルダパス] --project-key <プロジェクトキー> --project-name <プロジェクト名>
```

引数を省略した場合は、**カレントフォルダ**を診断対象として使用します。

### 例

- カレントフォルダ: `/sonar-scan`
- 基本スキャン: `/sonar-scan C:\work\myproject`
- プロジェクトキー指定: `/sonar-scan C:\work\myproject --project-key my-project`
- フル指定: `/sonar-scan C:\work\myproject --project-key my-project --project-name "My Project"`

---

# Skill Instructions

あなたはSonarScannerを使用してコードの品質・セキュリティ診断を実行するタスクを担当します。

## Step 1: 引数の解析

ユーザーの入力から以下を抽出します：

- **対象フォルダパス**: 診断対象のディレクトリ（省略時はカレントフォルダを使用）
- **プロジェクトキー**: `--project-key` オプション（省略時はフォルダ名から自動生成）
- **プロジェクト名**: `--project-name` オプション（省略時はプロジェクトキーと同じ）

対象フォルダが指定されていない場合は、カレントフォルダ（`.`）を使用します。

## Step 2: 環境変数の確認

以下の環境変数が設定されているか確認します：

```bash
echo "SONAR_HOST_URL=${SONAR_HOST_URL}"
echo "SONAR_TOKEN=${SONAR_TOKEN}"
```

いずれかが未設定の場合はエラーを報告して終了します：

```
以下の環境変数が設定されていません:
- SONAR_HOST_URL: SonarQubeサーバーのURL（例: http://localhost:9000）
- SONAR_TOKEN: SonarQubeの認証トークン

環境変数を設定してから再実行してください。
```

## Step 3: 対象フォルダの確認

対象フォルダが存在するか確認します：

```bash
ls "<対象フォルダパス>"
```

存在しない場合はエラーを報告して終了します。

## Step 4: プロジェクトキーの決定

プロジェクトキーが指定されていない場合、フォルダ名から自動生成します：

```bash
basename "<対象フォルダパス>"
```

プロジェクトキーのルール：
- 英数字、ハイフン、アンダースコア、ピリオドのみ使用可能
- スペースはハイフンに変換
- 大文字は小文字に変換

## Step 5: アプリ種別の検出と言語別設定の決定

対象フォルダのアプリ種別を以下の順で判定します：

```bash
# Java判定: .javaファイル または Mavenビルドファイル
find "<対象フォルダパス>" -name "*.java" -maxdepth 5 | head -1
ls "<対象フォルダパス>/pom.xml" 2>/dev/null || ls "<対象フォルダパス>/build.gradle" 2>/dev/null || ls "<対象フォルダパス>/build.gradle.kts" 2>/dev/null

# C#判定: .csprojファイル または .slnファイル
find "<対象フォルダパス>" -name "*.csproj" -maxdepth 4 | head -1
find "<対象フォルダパス>" -name "*.sln" -maxdepth 3 | head -1

# Next.js判定: next.config.* または package.jsonのnext依存
ls "<対象フォルダパス>/next.config.js" 2>/dev/null || ls "<対象フォルダパス>/next.config.ts" 2>/dev/null || ls "<対象フォルダパス>/next.config.mjs" 2>/dev/null
grep -l '"next"' "<対象フォルダパス>/package.json" 2>/dev/null
```

**判定優先順位:** Java → C# → Next.js → その他

Javaアプリと判定する条件：`.java` ファイルが存在する、または `pom.xml` / `build.gradle` / `build.gradle.kts` が存在する。
C#アプリと判定する条件：`.csproj` または `.sln` ファイルが存在する。
Next.jsアプリと判定する条件：`next.config.*` が存在する、または `package.json` に `"next"` への依存が含まれる。

### Javaアプリの場合: ライブラリパスの探索

`sonar.java.libraries` に指定するJARファイルのパスを以下の優先順位で探します：

**1. Mavenプロジェクト（pom.xmlが存在）:**

```bash
# Mavenローカルリポジトリを使用
JAVA_LIBS="${HOME}/.m2/repository/**/*.jar"

# または target/dependency フォルダ（dependency:copy-dependencies 実行済みの場合）
ls "<対象フォルダパス>/target/dependency" 2>/dev/null
```

`target/dependency` が存在する場合はそちらを優先：
```
sonar.java.libraries=target/dependency/*.jar
```

存在しない場合はMavenローカルリポジトリを指定：
```
sonar.java.libraries=${HOME}/.m2/repository/**/*.jar
```

**2. Gradleプロジェクト（build.gradleが存在）:**

```bash
# Gradleキャッシュを確認
ls "${HOME}/.gradle/caches/modules-2/files-2.1" 2>/dev/null

# build/libs または build/dependencies フォルダを確認
ls "<対象フォルダパス>/build/libs" 2>/dev/null
```

Gradleキャッシュが存在する場合：
```
sonar.java.libraries=${HOME}/.gradle/caches/modules-2/files-2.1/**/*.jar
```

**3. JARファイルが見つからない場合:**

JDKのrt.jarまたはJava標準ライブラリを指定：

```bash
# Java標準ライブラリのパスを確認
java -XshowSettings:all -version 2>&1 | grep "java.home"
JAVA_HOME_PATH=$(java -XshowSettings:all -version 2>&1 | grep "java.home" | awk '{print $3}')
```

```
sonar.java.libraries=${JAVA_HOME}/lib/*.jar
```

**4. いずれも見つからない場合:**

`sonar.java.libraries` の指定をスキップし、警告を表示：
```
⚠️ Javaライブラリが見つかりませんでした。sonar.java.binaries のみで解析します。
  正確な解析のために以下を実行してください：
  - Maven: mvn dependency:copy-dependencies
  - Gradle: gradle dependencies
```

### Javaアプリの場合: バイナリパスの確認

```bash
# コンパイル済みクラスファイルの確認
ls "<対象フォルダパス>/target/classes" 2>/dev/null  # Maven
ls "<対象フォルダパス>/build/classes" 2>/dev/null    # Gradle
```

`sonar.java.binaries` の決定（テストクラスは含めない）：
- `target/classes` が存在する場合: `sonar.java.binaries=target/classes`
- `build/classes` が存在する場合: `sonar.java.binaries=build/classes`
- どちらも存在しない場合: `sonar.java.binaries=.` (ルートフォルダを指定)

### テストクラスの除外設定

テストコードをスキャン対象から除外するための設定を決定します。

**Javaアプリの場合：**

```bash
# 標準ディレクトリレイアウト（Maven/Gradle標準）の確認
ls "<対象フォルダパス>/src/main/java" 2>/dev/null
ls "<対象フォルダパス>/src/test/java" 2>/dev/null
```

- `src/main/java` が存在する場合（標準レイアウト）:
  - `sonar.sources=src/main/java` に絞り込む（テストディレクトリを含めない）
  - `sonar.tests=src/test/java`（テストは別途認識させる）

- 標準レイアウトでない場合:
  - `sonar.sources=.` のままにし、`sonar.exclusions` でテストを除外:
    ```
    sonar.exclusions=**/*Test.java,**/*Tests.java,**/*Spec.java,**/test/**,**/tests/**
    ```

**C#アプリの場合：**

```bash
# テストプロジェクトフォルダの確認（*.Tests, *.Test フォルダ）
find "<対象フォルダパス>" -name "*.Tests.csproj" -o -name "*.Test.csproj" | head -5
```

- テストプロジェクトが別フォルダに分離されている場合（推奨構成）:
  - テストプロジェクトフォルダ名（例: `MyApp.Tests`）を特定し、`sonar.exclusions` で除外:
    ```
    sonar.exclusions=**/*.Tests/**,**/*.Test/**,**/*Tests.cs,**/*Test.cs
    ```
- テストが混在している場合:
  ```
  sonar.exclusions=**/*Tests.cs,**/*Test.cs,**/*Spec.cs,**/test/**,**/tests/**
  ```

C#のDLLパス（`sonar.cs.dll.directories`）の決定：

```bash
# コンパイル済みDLLの確認
find "<対象フォルダパス>" -path "*/bin/Debug/*.dll" -not -path "*Test*" | head -3
find "<対象フォルダパス>" -path "*/bin/Release/*.dll" -not -path "*Test*" | head -3
```

- `bin/Release` が存在する場合: `sonar.cs.dll.directories=**/bin/Release`（本番ビルドを優先）
- `bin/Debug` のみの場合: `sonar.cs.dll.directories=**/bin/Debug`
- DLLが見つからない場合: 警告を表示し `dotnet build` の実行を提案

**Next.jsアプリの場合：**

```bash
# srcディレクトリの確認
ls "<対象フォルダパス>/src" 2>/dev/null
# app router / pages router の確認
ls "<対象フォルダパス>/app" 2>/dev/null || ls "<対象フォルダパス>/src/app" 2>/dev/null
ls "<対象フォルダパス>/pages" 2>/dev/null || ls "<対象フォルダパス>/src/pages" 2>/dev/null
```

- `src/` フォルダが存在する場合: `sonar.sources=src`
- 存在しない場合: `sonar.sources=.`

テスト除外（Next.js/TypeScript標準パターン）:
```
sonar.exclusions=**/*.test.ts,**/*.spec.ts,**/*.test.tsx,**/*.spec.tsx,**/__tests__/**,**/cypress/**,**/*.cy.ts,**/*.cy.tsx,**/*.test.js,**/*.spec.js,node_modules/**,.next/**,out/**
```

**その他のアプリ（JS/TS/Python等）：**

テスト関連ファイル・フォルダを `sonar.exclusions` で除外:

```
sonar.exclusions=**/*.test.js,**/*.spec.js,**/*.test.ts,**/*.spec.ts,**/test/**,**/tests/**,**/__tests__/**,**/*.test.py,**/*_test.py,**/conftest.py
```

**変数として保持する:**
- `APP_TYPE`: アプリ種別（`java` / `csharp` / `nextjs` / `other`）
- `SONAR_SOURCES`: ソースパス
- `SONAR_EXCLUSIONS`: 除外パターン
- `SONAR_TESTS`: テストソースパス（Java標準レイアウト時のみ）
- `CS_DLL_DIRS`: DLLディレクトリ（C#のみ）

## Step 6: SonarScannerのインストール確認・インストール

npxで実行するため、sonarqube-scannerパッケージが利用可能か確認します：

```bash
npx sonar-scanner --version 2>&1
```

npxが使用できない場合はnpmでグローバルインストールを提案します：

```
SonarScannerをグローバルインストールしますか？
npm install -g sonarqube-scanner
```

## Step 7: SonarScannerの実行

Step 5で決定した変数（`APP_TYPE`、`SONAR_SOURCES`、`SONAR_EXCLUSIONS`、`SONAR_TESTS`、`CS_DLL_DIRS`）を使用します。

### Javaアプリの場合（標準レイアウト: src/main/java が存在）

```bash
cd "<対象フォルダパス>" && npx sonar-scanner \
  -Dsonar.projectKey="<プロジェクトキー>" \
  -Dsonar.projectName="<プロジェクト名>" \
  -Dsonar.sources="src/main/java" \
  -Dsonar.tests="src/test/java" \
  -Dsonar.java.libraries="<JAVA_LIBS>" \
  -Dsonar.java.binaries="target/classes" \
  -Dsonar.host.url="${SONAR_HOST_URL}" \
  -Dsonar.token="${SONAR_TOKEN}" \
  2>&1
```

### Javaアプリの場合（非標準レイアウト）

```bash
cd "<対象フォルダパス>" && npx sonar-scanner \
  -Dsonar.projectKey="<プロジェクトキー>" \
  -Dsonar.projectName="<プロジェクト名>" \
  -Dsonar.sources="." \
  -Dsonar.exclusions="**/*Test.java,**/*Tests.java,**/*Spec.java,**/test/**,**/tests/**" \
  -Dsonar.java.libraries="<JAVA_LIBS>" \
  -Dsonar.java.binaries="<JAVA_BINARIES>" \
  -Dsonar.host.url="${SONAR_HOST_URL}" \
  -Dsonar.token="${SONAR_TOKEN}" \
  2>&1
```

### C#アプリの場合

`sonar.cs.dll.directories` に本番用DLLフォルダを指定します（テストプロジェクトのDLLは含めない）。

```bash
cd "<対象フォルダパス>" && npx sonar-scanner \
  -Dsonar.projectKey="<プロジェクトキー>" \
  -Dsonar.projectName="<プロジェクト名>" \
  -Dsonar.sources="." \
  -Dsonar.exclusions="**/*.Tests/**,**/*.Test/**,**/*Tests.cs,**/*Test.cs,**/*Spec.cs" \
  -Dsonar.cs.dll.directories="<CS_DLL_DIRS>" \
  -Dsonar.host.url="${SONAR_HOST_URL}" \
  -Dsonar.token="${SONAR_TOKEN}" \
  2>&1
```

DLLが見つからない場合は警告を表示：
```
⚠️ コンパイル済みDLLが見つかりませんでした。
  正確な解析のために先にビルドを実行してください：
  dotnet build
  sonar.cs.dll.directories の指定なしで続行します。
```

### Next.jsアプリの場合

`src/` フォルダが存在する場合はそれをソースパスに、ない場合は `.` を使用します。

```bash
cd "<対象フォルダパス>" && npx sonar-scanner \
  -Dsonar.projectKey="<プロジェクトキー>" \
  -Dsonar.projectName="<プロジェクト名>" \
  -Dsonar.sources="<SONAR_SOURCES>" \
  -Dsonar.exclusions="**/*.test.ts,**/*.spec.ts,**/*.test.tsx,**/*.spec.tsx,**/__tests__/**,**/cypress/**,**/*.cy.ts,**/*.cy.tsx,**/*.test.js,**/*.spec.js,node_modules/**,.next/**,out/**" \
  -Dsonar.host.url="${SONAR_HOST_URL}" \
  -Dsonar.token="${SONAR_TOKEN}" \
  2>&1
```

### その他のアプリ（JS/TS/Python等）の場合

```bash
cd "<対象フォルダパス>" && npx sonar-scanner \
  -Dsonar.projectKey="<プロジェクトキー>" \
  -Dsonar.projectName="<プロジェクト名>" \
  -Dsonar.sources="." \
  -Dsonar.exclusions="**/*.test.js,**/*.spec.js,**/*.test.ts,**/*.spec.ts,**/test/**,**/tests/**,**/__tests__/**,**/*.test.py,**/*_test.py,**/conftest.py" \
  -Dsonar.host.url="${SONAR_HOST_URL}" \
  -Dsonar.token="${SONAR_TOKEN}" \
  2>&1
```

## Step 8: タイムスタンプの生成と結果ログの保存

スキャン実行後、結果をタイムスタンプ付きログファイルとして保存します：

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$datetime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$target = "<対象フォルダパス>"
$projectKey = "<プロジェクトキー>"
$outLog = "$target\sonar_$timestamp.log"

$header = @"
# SonarScanner 診断ログ
# 実行日時: $datetime
# 対象フォルダ: $target
# プロジェクトキー: $projectKey
# SonarQube URL: $env:SONAR_HOST_URL
# ================================================================

"@
$header | Out-File -FilePath $outLog -Encoding UTF8
```

ログファイル名: `sonar_<YYYYMMDD_HHMMSS>.log`
保存先: 診断対象フォルダ直下

実際のBashコマンドとして一括実行する例（非Javaアプリ）：

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATETIME=$(date +"%Y-%m-%d %H:%M:%S")
TARGET="<対象フォルダパス>"
PROJECT_KEY="<プロジェクトキー>"
PROJECT_NAME="<プロジェクト名>"
OUT_LOG="${TARGET}/sonar_${TIMESTAMP}.log"
TEST_EXCLUSIONS="**/*.test.js,**/*.spec.js,**/*.test.ts,**/*.spec.ts,**/test/**,**/tests/**,**/__tests__/**,**/*.test.py,**/*_test.py,**/conftest.py"

{
  echo "# SonarScanner 診断ログ"
  echo "# 実行日時: ${DATETIME}"
  echo "# 対象フォルダ: ${TARGET}"
  echo "# プロジェクトキー: ${PROJECT_KEY}"
  echo "# SonarQube URL: ${SONAR_HOST_URL}"
  echo "# ================================================================"
  echo ""
  cd "${TARGET}" && npx sonar-scanner \
    -Dsonar.projectKey="${PROJECT_KEY}" \
    -Dsonar.projectName="${PROJECT_NAME}" \
    -Dsonar.sources="." \
    -Dsonar.exclusions="${TEST_EXCLUSIONS}" \
    -Dsonar.host.url="${SONAR_HOST_URL}" \
    -Dsonar.token="${SONAR_TOKEN}"
} 2>&1 | tee "${OUT_LOG}"
```

実際のBashコマンドとして一括実行する例（Javaアプリ - Maven標準レイアウト）：

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATETIME=$(date +"%Y-%m-%d %H:%M:%S")
TARGET="<対象フォルダパス>"
PROJECT_KEY="<プロジェクトキー>"
PROJECT_NAME="<プロジェクト名>"
OUT_LOG="${TARGET}/sonar_${TIMESTAMP}.log"

# Javaライブラリパスの決定
if [ -d "${TARGET}/target/dependency" ]; then
  JAVA_LIBS="${TARGET}/target/dependency/*.jar"
  JAVA_BINS="target/classes"
elif [ -d "${HOME}/.m2/repository" ]; then
  JAVA_LIBS="${HOME}/.m2/repository/**/*.jar"
  JAVA_BINS="target/classes"
elif [ -d "${HOME}/.gradle/caches" ]; then
  JAVA_LIBS="${HOME}/.gradle/caches/modules-2/files-2.1/**/*.jar"
  JAVA_BINS="build/classes"
else
  JAVA_LIBS=""
  JAVA_BINS="."
fi

# ソースパスとテスト除外の決定
if [ -d "${TARGET}/src/main/java" ]; then
  # 標準レイアウト: src/main/java に絞り込む（テスト除外不要）
  SONAR_SOURCES="src/main/java"
  SONAR_TESTS_OPT="-Dsonar.tests=src/test/java"
  SONAR_EXCLUSIONS_OPT=""
else
  # 非標準レイアウト: exclusionsでテストを除外
  SONAR_SOURCES="."
  SONAR_TESTS_OPT=""
  SONAR_EXCLUSIONS_OPT="-Dsonar.exclusions=**/*Test.java,**/*Tests.java,**/*Spec.java,**/test/**,**/tests/**"
fi

{
  echo "# SonarScanner 診断ログ (Java)"
  echo "# 実行日時: ${DATETIME}"
  echo "# 対象フォルダ: ${TARGET}"
  echo "# プロジェクトキー: ${PROJECT_KEY}"
  echo "# SonarQube URL: ${SONAR_HOST_URL}"
  echo "# Javaライブラリ: ${JAVA_LIBS}"
  echo "# ソースパス: ${SONAR_SOURCES}"
  echo "# ================================================================"
  echo ""
  SONAR_OPTS="-Dsonar.projectKey=${PROJECT_KEY} -Dsonar.projectName=${PROJECT_NAME} -Dsonar.sources=${SONAR_SOURCES} -Dsonar.java.binaries=${JAVA_BINS} -Dsonar.host.url=${SONAR_HOST_URL} -Dsonar.token=${SONAR_TOKEN}"
  [ -n "${JAVA_LIBS}" ] && SONAR_OPTS="${SONAR_OPTS} -Dsonar.java.libraries=${JAVA_LIBS}"
  [ -n "${SONAR_TESTS_OPT}" ] && SONAR_OPTS="${SONAR_OPTS} ${SONAR_TESTS_OPT}"
  [ -n "${SONAR_EXCLUSIONS_OPT}" ] && SONAR_OPTS="${SONAR_OPTS} ${SONAR_EXCLUSIONS_OPT}"
  cd "${TARGET}" && npx sonar-scanner ${SONAR_OPTS}
} 2>&1 | tee "${OUT_LOG}"
```

実際のBashコマンドとして一括実行する例（C#アプリ）：

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATETIME=$(date +"%Y-%m-%d %H:%M:%S")
TARGET="<対象フォルダパス>"
PROJECT_KEY="<プロジェクトキー>"
PROJECT_NAME="<プロジェクト名>"
OUT_LOG="${TARGET}/sonar_${TIMESTAMP}.log"

# DLLディレクトリの決定（テストプロジェクトを除外）
if find "${TARGET}" -path "*/bin/Release/*.dll" -not -path "*Test*" | grep -q .; then
  CS_DLL_DIRS="**/bin/Release"
elif find "${TARGET}" -path "*/bin/Debug/*.dll" -not -path "*Test*" | grep -q .; then
  CS_DLL_DIRS="**/bin/Debug"
else
  CS_DLL_DIRS=""
  echo "⚠️ DLLが見つかりません。dotnet build を先に実行してください。"
fi

{
  echo "# SonarScanner 診断ログ (C#)"
  echo "# 実行日時: ${DATETIME}"
  echo "# 対象フォルダ: ${TARGET}"
  echo "# プロジェクトキー: ${PROJECT_KEY}"
  echo "# SonarQube URL: ${SONAR_HOST_URL}"
  echo "# DLLディレクトリ: ${CS_DLL_DIRS}"
  echo "# ================================================================"
  echo ""
  SONAR_OPTS="-Dsonar.projectKey=${PROJECT_KEY} -Dsonar.projectName=${PROJECT_NAME} -Dsonar.sources=. -Dsonar.exclusions=**/*.Tests/**,**/*.Test/**,**/*Tests.cs,**/*Test.cs,**/*Spec.cs -Dsonar.host.url=${SONAR_HOST_URL} -Dsonar.token=${SONAR_TOKEN}"
  [ -n "${CS_DLL_DIRS}" ] && SONAR_OPTS="${SONAR_OPTS} -Dsonar.cs.dll.directories=${CS_DLL_DIRS}"
  cd "${TARGET}" && npx sonar-scanner ${SONAR_OPTS}
} 2>&1 | tee "${OUT_LOG}"
```

実際のBashコマンドとして一括実行する例（Next.jsアプリ）：

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATETIME=$(date +"%Y-%m-%d %H:%M:%S")
TARGET="<対象フォルダパス>"
PROJECT_KEY="<プロジェクトキー>"
PROJECT_NAME="<プロジェクト名>"
OUT_LOG="${TARGET}/sonar_${TIMESTAMP}.log"
NEXTJS_EXCLUSIONS="**/*.test.ts,**/*.spec.ts,**/*.test.tsx,**/*.spec.tsx,**/__tests__/**,**/cypress/**,**/*.cy.ts,**/*.cy.tsx,**/*.test.js,**/*.spec.js,node_modules/**,.next/**,out/**"

# ソースパスの決定
if [ -d "${TARGET}/src" ]; then
  SONAR_SOURCES="src"
else
  SONAR_SOURCES="."
fi

{
  echo "# SonarScanner 診断ログ (Next.js)"
  echo "# 実行日時: ${DATETIME}"
  echo "# 対象フォルダ: ${TARGET}"
  echo "# プロジェクトキー: ${PROJECT_KEY}"
  echo "# SonarQube URL: ${SONAR_HOST_URL}"
  echo "# ソースパス: ${SONAR_SOURCES}"
  echo "# ================================================================"
  echo ""
  cd "${TARGET}" && npx sonar-scanner \
    -Dsonar.projectKey="${PROJECT_KEY}" \
    -Dsonar.projectName="${PROJECT_NAME}" \
    -Dsonar.sources="${SONAR_SOURCES}" \
    -Dsonar.exclusions="${NEXTJS_EXCLUSIONS}" \
    -Dsonar.host.url="${SONAR_HOST_URL}" \
    -Dsonar.token="${SONAR_TOKEN}"
} 2>&1 | tee "${OUT_LOG}"
```

## Step 10: 結果のサマリーを報告

スキャン完了後、以下の情報をチャットに表示します：

```
✅ SonarScanner 診断完了

📁 対象フォルダ: <対象フォルダパス>
🔑 プロジェクトキー: <プロジェクトキー>
🌐 SonarQube URL: <SONAR_HOST_URL>
🕐 実行日時: <YYYY-MM-DD HH:MM:SS>

📊 診断結果の確認:
  以下のURLで詳細結果を確認できます：
  <SONAR_HOST_URL>/dashboard?id=<プロジェクトキー>

💾 ログファイル:
  <対象フォルダ>\sonar_<timestamp>.log
```

スキャンが失敗した場合（終了コードが0以外）：

```
❌ SonarScanner 診断に失敗しました

エラーの原因として以下が考えられます：
- SonarQubeサーバーに接続できない（SONAR_HOST_URL を確認）
- 認証トークンが無効（SONAR_TOKEN を確認）
- プロジェクトキーの形式が不正
- ネットワーク接続の問題

ログファイルの内容を確認してください：
<対象フォルダ>\sonar_<timestamp>.log
```

## 注意事項

- SonarScannerの初回実行時はパッケージのダウンロードに時間がかかります。
- `SONAR_TOKEN` はログやチャットに表示しないよう注意してください。
- 既存の `sonar-project.properties` ファイルがある場合、そのファイルの設定が優先されます。
- Java 17以上が必要です（SonarScannerの依存関係）。
- SonarQubeサーバーが起動していることを事前に確認してください。
