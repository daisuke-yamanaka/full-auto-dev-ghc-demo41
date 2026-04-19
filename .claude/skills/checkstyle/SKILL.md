---
name: checkstyle
description: 指定フォルダのJavaコードをCheckstyleでスタイルチェックし、結果を年月日_時分秒のファイル名で出力する。「checkstyle」「チェックスタイル」「Javaスタイル」「Javaリント」などのキーワードで呼び出される。
allowed-tools: Bash, Read, Write, Glob
---

# checkstyle スキル（Java / Checkstyle 専用）

指定されたフォルダの Java コードに対して Checkstyle を実行し、結果を検査対象フォルダ内にタイムスタンプ付きファイルとして保存します。

## 使い方

```
/checkstyle [検査対象フォルダパス]
```

引数を省略した場合は、**カレントフォルダ**を検査対象として使用します。

### 例

- カレントフォルダ: `/checkstyle`
- フォルダ指定: `/checkstyle C:\work\myproject`

---

# Skill Instructions

あなたは Java コードのスタイルチェック（Checkstyle）を実行するタスクを担当します。

## Step 1: 引数の解析

ユーザーの入力から以下を抽出します：

- **対象フォルダパス**: チェック対象のディレクトリ（省略時はカレントフォルダを使用）

対象フォルダが指定されていない場合は、カレントフォルダ（`.`）を使用します。

## Step 2: 対象フォルダの確認

```bash
ls "<対象フォルダパス>"
```

存在しない場合はエラーを報告して終了します。

## Step 3: Java ファイルの確認

```bash
TARGET="<対象フォルダパス>"
JAVA_COUNT=$(find "$TARGET" -name "*.java" | wc -l)
echo "Java: $JAVA_COUNT"
```

Java ファイルが 0 件の場合はエラーを報告して終了します。

## Step 4: タイムスタンプの取得

```bash
TIMESTAMP=$(powershell -Command "Get-Date -Format 'yyyyMMdd_HHmmss'")
DATETIME=$(powershell -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'")
```

## Step 5: Checkstyle 実行

### ルールセットの決定（優先順位順）

```bash
# プロジェクト内のカスタム設定ファイルを探す
CHECKSTYLE_CONFIG=$(find "$TARGET" -name "checkstyle.xml" -o -name "google_checks.xml" -o -name "sun_checks.xml" 2>/dev/null | head -1)

if [ -z "$CHECKSTYLE_CONFIG" ]; then
  # カスタム設定がなければ Google スタイル（Checkstyle 組み込み）を使用
  CHECKSTYLE_CONFIG="google_checks.xml"
  CONFIG_LABEL="Google スタイル（デフォルト）"
else
  CONFIG_LABEL="カスタム設定: $CHECKSTYLE_CONFIG"
fi
```

### 実行方式の決定（優先順位順）

```bash
OUT_FILE="$TARGET/checkstyle_${TIMESTAMP}.txt"

# 方式1: Maven
if [ -f "$TARGET/pom.xml" ]; then
  {
    echo "# Java Checkstyle 結果"
    echo "# 実行日時: $DATETIME"
    echo "# 対象フォルダ: $TARGET"
    echo "# ルール: $CONFIG_LABEL"
    echo "# 実行: Maven (mvn checkstyle:checkstyle)"
    echo "# ========================================"
    mvn checkstyle:checkstyle -f "$TARGET/pom.xml" 2>&1
    if [ -f "$TARGET/target/checkstyle-result.xml" ]; then
      echo ""
      echo "# checkstyle-result.xml:"
      cat "$TARGET/target/checkstyle-result.xml"
    fi
  } > "$OUT_FILE"

# 方式2: Gradle
elif [ -f "$TARGET/build.gradle" ] || [ -f "$TARGET/build.gradle.kts" ]; then
  {
    echo "# Java Checkstyle 結果"
    echo "# 実行日時: $DATETIME"
    echo "# 対象フォルダ: $TARGET"
    echo "# ルール: $CONFIG_LABEL"
    echo "# 実行: Gradle (checkstyleMain)"
    echo "# ========================================"
    cd "$TARGET"
    if [ -f "./gradlew" ]; then
      ./gradlew checkstyleMain 2>&1
    else
      gradle checkstyleMain 2>&1
    fi
  } > "$OUT_FILE"

# 方式3: スタンドアロン jar
else
  # このスキルに同梱された jar を使用
  SKILL_DIR="$(dirname "$0")"
  JAR=$(find "$SKILL_DIR" -name "checkstyle-*.jar" 2>/dev/null | head -1)

  # スキルの jar がなければプロジェクト内や既知パスを検索
  if [ -z "$JAR" ]; then
    JAR=$(find "$TARGET" -name "checkstyle-*.jar" 2>/dev/null | head -1)
  fi
  if [ -z "$JAR" ]; then
    JAR=$(find /c/Users -name "checkstyle-*.jar" 2>/dev/null | head -1)
  fi

  # jar がなければダウンロード
  if [ -z "$JAR" ]; then
    CHECKSTYLE_VERSION="10.21.4"
    JAR="$TARGET/checkstyle-${CHECKSTYLE_VERSION}-all.jar"
    curl -L "https://github.com/checkstyle/checkstyle/releases/download/checkstyle-${CHECKSTYLE_VERSION}/checkstyle-${CHECKSTYLE_VERSION}-all.jar" -o "$JAR"
  fi

  {
    echo "# Java Checkstyle 結果"
    echo "# 実行日時: $DATETIME"
    echo "# 対象フォルダ: $TARGET"
    echo "# ルール: $CONFIG_LABEL"
    echo "# 実行: スタンドアロン jar"
    echo "# ========================================"
    java -jar "$JAR" -c "$CHECKSTYLE_CONFIG" -r "$TARGET" 2>&1
  } > "$OUT_FILE"
fi
```

## Step 6: サマリーの表示

最終レポートファイルを読み取り、エラー数・警告数を集計してチャットに表示します：

```bash
ERRORS=$(grep -c "\[ERROR\]" "$OUT_FILE" 2>/dev/null || echo 0)
WARNS=$(grep -c "\[WARN\]" "$OUT_FILE" 2>/dev/null || echo 0)
```

チャットに以下の形式でサマリーを表示します：

```
✅ Checkstyle 完了

📁 対象フォルダ: <対象フォルダパス>
🕐 実行日時: <YYYY-MM-DD HH:MM:SS>
🔧 ルール: <ルール名>
⚙️  実行方式: <Maven / Gradle / スタンドアロン jar>

📊 検出結果:
  ERROR : XX 件
  WARN  : XX 件

💾 結果ファイル: <対象フォルダ>\checkstyle_<timestamp>.txt
```

## 注意事項

- **スタンドアロン jar**: `java -jar` 実行には JDK が必要。見つからない場合はユーザーに案内する
- このスキルフォルダに `checkstyle-10.21.4-all.jar` と `checkstyle.xml` が同梱されている
- 出力ファイルは検査対象フォルダに保存されます。書き込み権限があることを確認してください
- JS/TS のスタイルチェックは `/eslint` スキルを、C# は `/dotnet-format` スキルを使用してください
