---
name: sonar-report
description: SonarQubeサーバーから解析済みプロジェクトの結果を取得し、重要度別サマリと減点方式スコアをmdファイルで出力する。「sonarレポート」「SonarQube結果」「品質レポート」「sonar report」などのキーワードで呼び出される。
allowed-tools: Bash, Write
---

# SonarQube レポート生成スキル

SonarQubeサーバーから解析済みプロジェクトの結果を取得し、重要度の高い順にリスト化したMarkdownレポートを生成します。
接続情報は環境変数（`SONAR_HOST_URL`、`SONAR_TOKEN`）から取得します。

## 使い方

```
/sonar-report [対象フォルダパス]
/sonar-report [対象フォルダパス] --project-key <プロジェクトキー>
```

引数を省略した場合は、**カレントフォルダ**を対象として使用します。

### 例

- カレントフォルダ: `/sonar-report`
- 基本: `/sonar-report C:\work\myproject`
- キー指定: `/sonar-report C:\work\myproject --project-key my-project`

---

# Skill Instructions

あなたはSonarQubeサーバーから解析結果を取得してMarkdownレポートを生成するタスクを担当します。

## 減点スコアの定義

| 重要度 | 1件あたりの減点 |
|--------|----------------|
| BLOCKER | -100点 |
| CRITICAL | -50点 |
| MAJOR | -10点 |
| MINOR | -3点 |
| INFO | -1点 |

合計減点 = (BLOCKER数 × 100) + (CRITICAL数 × 50) + (MAJOR数 × 10) + (MINOR数 × 3) + (INFO数 × 1)

## Step 1: 引数の解析

- **対象フォルダパス**: 省略時はカレントフォルダ（`.`）を使用。
- **プロジェクトキー**: `--project-key` で指定。省略時はフォルダ名をそのままプロジェクトキーとして使用。

## Step 2: 環境変数の確認

```bash
echo "SONAR_HOST_URL=${SONAR_HOST_URL}"
echo "SONAR_TOKEN_SET=$([ -n "${SONAR_TOKEN}" ] && echo 'yes' || echo 'no')"
```

未設定の場合はエラーを報告して終了。

## Step 3: プロジェクトキーの決定

プロジェクトキーが指定されていない場合、フォルダ名から取得します：

```bash
PROJECT_KEY=$(basename "<対象フォルダパス>")
```

## Step 4: SonarQube APIからデータ取得

以下の3つのAPIを呼び出してデータを収集します。

### 4-1: メトリクス取得

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/measures/component?component=${PROJECT_KEY}&metricKeys=bugs,vulnerabilities,code_smells,security_hotspots,coverage,duplicated_lines_density,ncloc,reliability_rating,security_rating,sqale_rating"
```

取得するメトリクス：
- `bugs`: バグ数
- `vulnerabilities`: 脆弱性数
- `code_smells`: コードスメル数
- `security_hotspots`: セキュリティホットスポット数
- `coverage`: テストカバレッジ（%）
- `duplicated_lines_density`: 重複行率（%）
- `ncloc`: コード行数
- `reliability_rating`: 信頼性評価（1=A, 2=B, 3=C, 4=D, 5=E）
- `security_rating`: セキュリティ評価
- `sqale_rating`: 保守性評価

### 4-2: 重要度別件数と種別取得

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/issues/search?componentKeys=${PROJECT_KEY}&facets=severities,types&ps=1"
```

facetsからBLOCKER/CRITICAL/MAJOR/MINOR/INFO各件数を取得。

### 4-3: 重要度の高い課題の詳細取得（BLOCKER + CRITICAL、最大50件）

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/issues/search?componentKeys=${PROJECT_KEY}&severities=BLOCKER,CRITICAL&ps=50&s=SEVERITY&asc=false"
```

BLOCKERとCRITICALが0件の場合はMAJORも取得（最大20件）：

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/issues/search?componentKeys=${PROJECT_KEY}&severities=MAJOR&ps=20&s=SEVERITY&asc=false"
```

### 4-4: クオリティゲート状態取得

```bash
curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/qualitygates/project_status?projectKey=${PROJECT_KEY}"
```

## Step 5: データの集計と減点スコア計算

取得したfacetsデータから各重要度の件数を集計し、減点スコアを計算します：

```
総減点 = (BLOCKER × 100) + (CRITICAL × 50) + (MAJOR × 10) + (MINOR × 3) + (INFO × 1)
```

評価ランク：
- 0点: S（完璧）
- 1〜50点: A（良好）
- 51〜200点: B（普通）
- 201〜500点: C（要改善）
- 501〜1000点: D（問題あり）
- 1001点以上: E（深刻）

レーティング変換（reliability_rating, security_rating, sqale_rating）：
- 1.0 → A, 2.0 → B, 3.0 → C, 4.0 → D, 5.0 → E

## Step 6: Markdownレポートの生成と保存

以下の形式でMarkdownファイルを生成します。
ファイル名: `sonar-report_<YYYYMMDD_HHMMSS>.md`
保存先: 対象フォルダ直下

### レポート形式

```markdown
# SonarQube 解析レポート

| 項目 | 値 |
|------|-----|
| プロジェクトキー | <PROJECT_KEY> |
| 対象フォルダ | <TARGET_FOLDER> |
| SonarQube URL | <SONAR_HOST_URL> |
| 実行日時 | <YYYY-MM-DD HH:MM:SS> |
| クオリティゲート | <PASSED/FAILED> |

---

## 総合評価

| 指標 | 値 |
|------|-----|
| **総減点スコア** | **-<N>点** |
| 評価ランク | <S/A/B/C/D/E> |
| コード行数 | <ncloc> 行 |
| テストカバレッジ | <coverage>% |
| 重複行率 | <duplicated_lines_density>% |

### 品質評価

| カテゴリ | 件数 | 評価 |
|----------|------|------|
| バグ | <bugs> | <A-E> |
| 脆弱性 | <vulnerabilities> | <A-E> |
| コードスメル | <code_smells> | <A-E> |
| セキュリティホットスポット | <security_hotspots> | — |

---

## 課題サマリー（重要度別）

| 重要度 | 件数 | 減点 | 小計 |
|--------|------|------|------|
| 🔴 BLOCKER | <N> | -100点/件 | -<N×100>点 |
| 🟠 CRITICAL | <N> | -50点/件 | -<N×50>点 |
| 🟡 MAJOR | <N> | -10点/件 | -<N×10>点 |
| 🔵 MINOR | <N> | -3点/件 | -<N×3>点 |
| ⚪ INFO | <N> | -1点/件 | -<N×1>点 |
| **合計** | **<合計件数>** | | **-<総減点>点** |

---

## 主要な課題一覧（BLOCKER・CRITICAL）

BLOCKERとCRITICALが存在しない場合はMAJORを表示。

### 🔴 BLOCKER（<N>件）

#### 1. <rule_id>
- **ファイル**: `<component_path>:<line>`
- **種別**: <BUG/VULNERABILITY/CODE_SMELL>
- **内容**: <message>
- **対応工数**: <effort>

...（以降同様）

### 🟠 CRITICAL（<N>件）

#### 1. <rule_id>
- **ファイル**: `<component_path>:<line>`
- **種別**: <BUG/VULNERABILITY/CODE_SMELL>
- **内容**: <message>
- **対応工数**: <effort>

...（以降同様）

---

## 改善推奨アクション

減点が大きい重要度から順に改善推奨事項を記載：

1. **<最も減点が大きい重要度>の解消**（-<減点>点）: <件数>件を解消すると<減点>点改善
2. ...

---

*このレポートは SonarQube API から自動生成されました。*
*詳細はダッシュボードを参照: <SONAR_HOST_URL>/dashboard?id=<PROJECT_KEY>*
```

## Step 7: 実際のBashコマンドで実行

以下のスクリプトで全ステップを一括実行します：

```bash
TARGET="<対象フォルダパス>"
PROJECT_KEY="<プロジェクトキー>"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATETIME=$(date +"%Y-%m-%d %H:%M:%S")
OUT_MD="${TARGET}/sonar-report_${TIMESTAMP}.md"

# メトリクス取得
MEASURES=$(curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/measures/component?component=${PROJECT_KEY}&metricKeys=bugs,vulnerabilities,code_smells,security_hotspots,coverage,duplicated_lines_density,ncloc,reliability_rating,security_rating,sqale_rating")

# 重要度別件数取得
FACETS=$(curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/issues/search?componentKeys=${PROJECT_KEY}&facets=severities,types&ps=1")

# BLOCKER/CRITICAL課題詳細取得
ISSUES_HIGH=$(curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/issues/search?componentKeys=${PROJECT_KEY}&severities=BLOCKER,CRITICAL&ps=50&s=SEVERITY&asc=false")

# MAJOR課題詳細取得（BLOCKER/CRITICALが0件の場合の補完用）
ISSUES_MAJOR=$(curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/issues/search?componentKeys=${PROJECT_KEY}&severities=MAJOR&ps=20&s=SEVERITY&asc=false")

# クオリティゲート取得
QG=$(curl -s -u "${SONAR_TOKEN}:" \
  "${SONAR_HOST_URL}/api/qualitygates/project_status?projectKey=${PROJECT_KEY}")

echo "データ取得完了。レポートを生成します..."
```

その後、取得したJSONデータをもとにMarkdownレポートを生成してWriteツールで保存します。

## Step 8: 完了報告

```
✅ SonarQube レポート生成完了

📁 対象フォルダ: <対象フォルダパス>
🔑 プロジェクトキー: <プロジェクトキー>
📊 総減点スコア: -<N>点（評価ランク: <S-E>）
📝 レポートファイル: <対象フォルダ>\sonar-report_<timestamp>.md
🌐 詳細ダッシュボード: <SONAR_HOST_URL>/dashboard?id=<PROJECT_KEY>
```

## 注意事項

- `SONAR_TOKEN` はレポートに含めません。
- APIエラー時（404等）はプロジェクトキーが誤っている可能性を報告します。
- 課題が500件を超える場合、詳細リストは重要度の高いものから上位件数のみ表示します。
- SonarQubeのバージョンによってAPIレスポンスが異なる場合があります。
