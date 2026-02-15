# playwright-regression 仕様書

## 1. 概要

### 1.1 目的

複数段階の認証（IAP、Okta、JリーグID等）が必要な開発環境において、QA担当者がリグレッションテストを効率的に実施できるCLIツールを提供する。

### 1.2 主な機能

- 認証状態の保存・再利用
- テストケースCSVからPlaywrightテストスクリプトの自動生成（Claude API利用）
- 生成済みスクリプトの繰り返し実行
- テスト結果のHTML形式レポート出力

### 1.3 利用者

- QA担当者（コーディングスキル不要）
- リグレッションテストの定期実行が必要な開発チーム

---

## 2. システム構成

### 2.1 ディレクトリ構造

```
playwright-regression/
├── package.json
├── README.md
├── SPECIFICATION.md        # 本仕様書
├── LICENSE
├── .gitignore
├── bin/
│   └── cli.js              # CLIエントリポイント
├── lib/
│   ├── auth.js             # 認証管理
│   ├── csv-reader.js       # CSV読み込み・パース
│   ├── test-generator.js   # テストスクリプト生成
│   ├── test-executor.js    # テスト実行エンジン
│   └── claude-client.js    # Claude API連携
├── config/
│   └── config.json         # 設定ファイル（APIキー等）
├── storage/
│   └── auth.json           # 認証状態（自動生成）
├── tests/                  # 生成されたテストスクリプト
└── playwright-report/      # レポート出力先（自動生成）
```

### 2.2 技術スタック

- Node.js (v18以上)
- Playwright (最新版)
- Anthropic API (Claude)
- CSV parser (csv-parse)
- Commander.js (CLI フレームワーク)

---

## 3. 機能仕様

### 3.1 コマンド一覧

| コマンド | 説明 | 使用頻度 |
|---------|------|---------|
| init | プロジェクト初期化・設定ファイル生成 | 初回のみ |
| auth | 認証状態の保存 | 初回 + 認証期限切れ時 |
| generate \<csv\> | CSVからテストスクリプト生成 | 初回 + テストケース変更時 |
| run [testIds...] | テスト実行 | 日常的 |
| report | レポート表示 | テスト実行後 |

### 3.2 各コマンド詳細

#### 3.2.1 init

```bash
playwright-regression init
```

**動作:**
1. `config/config.json`を生成（テンプレートから）
2. 必要なディレクトリ作成（`storage/`, `tests/`）
3. Playwrightのインストール確認・ブラウザダウンロード

**出力:**

```
✓ 設定ファイルを作成しました: config/config.json
✓ ディレクトリを作成しました
✓ Playwrightブラウザをインストールしました

次のステップ:
1. config/config.json に Claude APIキーを設定してください
2. playwright-regression auth で認証状態を保存してください
```

**config.json テンプレート:**

```json
{
  "anthropic": {
    "apiKey": "YOUR_API_KEY_HERE",
    "model": "claude-sonnet-4-5-20250929"
  },
  "playwright": {
    "headless": false,
    "timeout": 30000
  },
  "testUrl": "https://your-test-environment.example.com"
}
```

#### 3.2.2 auth

```bash
playwright-regression auth
```

**動作:**
1. config.jsonの`testUrl`を使用してブラウザ起動
2. ユーザーが手動で認証を実施（IAP → Okta → JリーグID）
3. ユーザーがEnterキーを押すと認証状態を保存
4. `storage/auth.json`に保存

**対話例:**

```
ブラウザを起動します...
認証を完了したら Enter キーを押してください:
✓ 認証状態を保存しました: storage/auth.json
```

**auth.json 形式:**

PlaywrightのstorageState標準形式

```json
{
  "cookies": [...],
  "origins": [...]
}
```

#### 3.2.3 generate

```bash
playwright-regression generate testcases.csv [--only TC001,TC002]
```

**引数:**

- `<csv>`: テストケースCSVファイルパス（必須）
- `--only`: 特定のテストIDのみ生成（オプション）

**CSVフォーマット:**

```csv
テストID,テスト目的,前提条件,期待結果
TC001,100円ガチャ購入で通貨10個増加確認,ログイン済み・通貨100個以上保有,購入前後で通貨が10個増加していること
TC002,SSRガチャ演出の確認,ログイン済み,SSR排出時に専用演出が表示されること
TC003,購入履歴への反映確認,ログイン済み,購入後に履歴ページに記録が追加されること
```

**動作:**
1. CSVファイルを読み込み・パース
2. 各行について:
   - テスト目的、前提条件、期待結果をClaude APIに送信
   - Playwrightテストコードを生成
   - `tests/{テストID}.spec.ts`として保存
3. 生成完了サマリー表示

**Claude APIへのプロンプト形式:**

```
あなたはPlaywrightテストコード生成の専門家です。
以下のテストケース情報から、Playwrightのテストコードを生成してください。

【テスト情報】
- テストID: TC001
- テスト目的: 100円ガチャ購入で通貨10個増加確認
- 前提条件: ログイン済み・通貨100個以上保有
- 期待結果: 購入前後で通貨が10個増加していること

【要件】
1. test()関数を使用したPlaywright形式
2. 購入前の通貨数を取得・保存
3. ガチャ購入操作を実行
4. 購入後の通貨数を取得
5. expect()で差分が10であることを検証
6. わかりやすいコメントを含める
7. 認証状態は既にロード済みと仮定

【出力形式】
TypeScriptコードのみを出力してください。説明文は不要です。
```

**生成されるコード例:**

```typescript
import { test, expect } from '@playwright/test';

test('TC001: 100円ガチャ購入で通貨10個増加確認', async ({ page }) => {
  // テスト対象URLに遷移
  await page.goto('https://your-test-environment.example.com/gacha');

  // 購入前の通貨数を取得
  const beforeCurrency = await page.locator('.currency-amount').textContent();
  const beforeValue = parseInt(beforeCurrency?.replace(/,/g, '') || '0');

  // 100円ガチャを購入
  await page.click('button:has-text("100円ガチャ")');
  await page.click('button:has-text("購入確定")');

  // 購入完了を待機
  await page.waitForSelector('.purchase-complete');

  // 購入後の通貨数を取得
  const afterCurrency = await page.locator('.currency-amount').textContent();
  const afterValue = parseInt(afterCurrency?.replace(/,/g, '') || '0');

  // 通貨が10個増加していることを検証
  expect(afterValue - beforeValue).toBe(10);
});
```

**出力:**

```
テストスクリプトを生成中...
✓ TC001.spec.ts を生成しました
✓ TC002.spec.ts を生成しました
✓ TC003.spec.ts を生成しました

3件のテストスクリプトを生成しました。
tests/ ディレクトリを確認してください。

次のステップ:
playwright-regression run でテストを実行してください
```

#### 3.2.4 run

```bash
playwright-regression run [testIds...]
```

**引数:**

- `[testIds...]`: 実行するテストID（オプション。未指定時は全テスト実行）

**動作:**
1. storage/auth.jsonの存在確認
2. tests/配下の.spec.tsファイルを検索
3. 指定されたテストIDのみ、または全テストを実行
4. Playwright Test実行（HTML Reporter有効）
5. 結果サマリー表示

**実行例:**

```bash
# 全テスト実行
playwright-regression run

# 特定のテストのみ実行
playwright-regression run TC001 TC003
```

**出力:**

```
テストを実行中...

Running 3 tests using 1 worker

  ✓ TC001.spec.ts:3:1 › TC001: 100円ガチャ購入で通貨10個増加確認 (5.2s)
  ✓ TC002.spec.ts:3:1 › TC002: SSRガチャ演出の確認 (3.8s)
  ✗ TC003.spec.ts:3:1 › TC003: 購入履歴への反映確認 (2.1s)

  3 passed, 1 failed (11.1s)

レポートを表示するには: playwright-regression report
```

**Playwright設定:**

- 認証状態をstorageStateとして自動ロード
- HTML Reporterを有効化
- スクリーンショット・ビデオは失敗時のみ

#### 3.2.5 report

```bash
playwright-regression report
```

**動作:**
1. `playwright-report/index.html`を開く
2. デフォルトブラウザで表示

**出力:**

```
レポートを表示します...
```

（ブラウザでPlaywrightの標準HTMLレポートが開く）

---

## 4. エラーハンドリング

### 4.1 認証状態が存在しない

```
エラー: 認証状態が見つかりません
playwright-regression auth を実行してください
```

### 4.2 設定ファイルが存在しない

```
エラー: 設定ファイルが見つかりません
playwright-regression init を実行してください
```

### 4.3 APIキーが未設定

```
エラー: Claude APIキーが設定されていません
config/config.json の anthropic.apiKey を設定してください
```

### 4.4 CSVファイルが存在しない

```
エラー: testcases.csv が見つかりません
ファイルパスを確認してください
```

### 4.5 Claude API エラー

```
エラー: Claude APIの呼び出しに失敗しました
- APIキーを確認してください
- ネットワーク接続を確認してください
詳細: [エラーメッセージ]
```

---

## 5. セキュリティ考慮事項

### 5.1 認証情報の管理

- storage/auth.jsonはローカルにのみ保存
- .gitignoreに追加し、バージョン管理から除外

### 5.2 APIキーの管理

- config/config.jsonを.gitignoreに追加
- 環境変数での上書きもサポート: `ANTHROPIC_API_KEY`

### 5.3 テストスクリプトの管理

- tests/配下はGit管理推奨（機密情報を含まない前提）
- 生成されたコードのレビューを推奨

---

## 6. 制限事項

### 6.1 Claude APIの呼び出し

- generate時のみAPIを使用
- run時は使用しない（コスト削減）

### 6.2 認証状態の有効期限

- 認証トークンの期限はサービス依存
- 期限切れ時は`playwright-regression auth`で再保存が必要

### 6.3 並列実行

- 初期バージョンでは順次実行のみサポート
- 将来的に並列実行オプションを追加予定
