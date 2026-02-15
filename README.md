# RegressionEcho

リグレッションテストを効率化するCLIツール。複数段階認証が必要な環境でも、テストケースCSVから自動でPlaywrightテストを生成・実行できます。

## 特徴

- 🔐 **認証状態の保存・再利用** - IAP、Okta等の多段階認証を一度突破すれば、以降は自動で認証状態を利用
- 🤖 **AI駆動のテスト生成** - Claude APIを使用して、テストケースCSVから自動でPlaywrightテストコードを生成
- 🔄 **リグレッションテスト最適化** - 一度生成したテストスクリプトを繰り返し実行（毎回AI呼び出し不要）
- 📊 **見やすいレポート** - Playwright標準のHTMLレポートで結果を確認
- 🎯 **QA担当者向け** - コーディング不要、コマンド実行のみで完結

## 必要な環境

- Node.js v18以上
- Claude API キー（[Anthropic Console](https://console.anthropic.com/)で取得）

## インストール

```bash
git clone https://github.com/k-sakQA/RegressionEcho.git
cd RegressionEcho
npm install
npm link  # グローバルコマンドとして使用可能にする
```

## 使い方

### 1. 初期セットアップ

```bash
playwright-regression init
```

- 設定ファイル（`config/config.json`）が生成されます
- `config/config.json`を開き、Claude APIキーを設定してください

```json
{
  "anthropic": {
    "apiKey": "sk-ant-xxxxx",
    "model": "claude-sonnet-4-5-20250929"
  },
  "playwright": {
    "headless": false,
    "timeout": 30000
  },
  "testUrl": "https://your-test-environment.example.com"
}
```

### 2. 認証状態の保存

```bash
playwright-regression auth
```

- ブラウザが起動するので、手動で認証を完了してください（IAP → Okta → JリーグID等）
- 認証完了後、Enterキーを押すと認証状態が保存されます

### 3. テストケースCSVの準備

以下の形式でCSVファイルを作成してください。

**testcases.csv:**

```csv
テストID,テスト目的,前提条件,期待結果
TC001,100円ガチャ購入で通貨10個増加確認,ログイン済み・通貨100個以上保有,購入前後で通貨が10個増加していること
TC002,SSRガチャ演出の確認,ログイン済み,SSR排出時に専用演出が表示されること
TC003,購入履歴への反映確認,ログイン済み,購入後に履歴ページに記録が追加されること
```

### 4. テストスクリプトの生成

```bash
playwright-regression generate testcases.csv
```

- CSVの各行から、Playwrightテストコードが自動生成されます
- 生成されたコードは`tests/`ディレクトリに保存されます
- この操作は初回のみ必要です（リグレッションテストなので、以降は同じスクリプトを繰り返し実行）

特定のテストのみ生成したい場合:

```bash
playwright-regression generate testcases.csv --only TC001,TC003
```

### 5. テストの実行

```bash
# 全テスト実行
playwright-regression run

# 特定のテストのみ実行
playwright-regression run TC001 TC003
```

### 6. 結果の確認

```bash
playwright-regression report
```

- ブラウザでPlaywright標準のHTMLレポートが開きます

## ワークフロー例

### 初期構築時（初回のみ）

```bash
playwright-regression init          # 1. 初期設定
# config/config.json にAPIキーを設定
playwright-regression auth          # 2. 認証状態を保存
playwright-regression generate testcases.csv  # 3. テストスクリプト生成
playwright-regression run           # 4. テスト実行・動作確認
git add tests/ && git commit        # 5. テストスクリプトをGit管理
```

### 日常のリグレッション実行

```bash
playwright-regression run           # テスト実行
playwright-regression report        # 結果確認
```

### テストケース変更時

```bash
# testcases.csv を編集
playwright-regression generate testcases.csv --only TC002  # 該当テストのみ再生成
playwright-regression run TC002     # 動作確認
```

## コマンドリファレンス

| コマンド | 説明 |
|---------|------|
| `init` | 初期設定（設定ファイル生成・ディレクトリ作成） |
| `auth` | 認証状態の保存 |
| `generate <csv> [--only テストID,...]` | CSVからテストスクリプト生成 |
| `run [testIds...]` | テスト実行 |
| `report` | レポート表示 |

## ディレクトリ構成

```
RegressionEcho/
├── config/
│   └── config.json         # 設定ファイル（APIキー等）
├── storage/
│   └── auth.json           # 認証状態（自動生成）
├── tests/                  # 生成されたテストスクリプト
│   ├── TC001.spec.ts
│   ├── TC002.spec.ts
│   └── TC003.spec.ts
└── playwright-report/      # テスト結果レポート（自動生成）
```

## .gitignore 推奨設定

```gitignore
# 認証情報（Git管理しない）
config/config.json
storage/

# レポート（自動生成）
playwright-report/
test-results/

# 依存関係
node_modules/
```

> **注意:** `tests/`ディレクトリはGit管理することを推奨します（テストの再現性確保のため）

## トラブルシューティング

### 認証が切れた場合

```bash
playwright-regression auth  # 再認証
```

### テスト生成がうまくいかない場合

- CSVフォーマットを確認してください（ヘッダー行が正しいか、文字コードがUTF-8か）
- Claude APIキーが正しく設定されているか確認してください
- 生成されたコードを手動で修正することも可能です（`tests/`配下のファイルを直接編集）

### テスト実行時にエラーが出る場合

- 認証状態が有効か確認してください
- `config.json`の`testUrl`が正しいか確認してください
- 生成されたテストコードをレビューし、必要に応じて修正してください

## 詳細仕様

詳細な仕様については[SPECIFICATION.md](./SPECIFICATION.md)を参照してください。

## ライセンス

MIT License - 詳細は[LICENSE](./LICENSE)を参照してください

## 作者

Kaz SAKATA ([@k-sakQA](https://github.com/k-sakQA))
