const Anthropic = require('@anthropic-ai/sdk');

class ClaudeClient {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model;
  }

  buildPrompt(testCase, testUrl, context = {}) {
    const selectorCatalog = context.selectorCatalog
      ? JSON.stringify(context.selectorCatalog, null, 2)
      : '未指定';

    return `あなたはPlaywrightテストコード生成の専門家です。
以下のテストケース情報から、Playwrightのテストコードを生成してください。

【テスト情報】
- テストID: ${testCase.testId}
- テスト目的: ${testCase.purpose}
- 前提条件: ${testCase.precondition}
- 期待結果: ${testCase.expected}
- テスト対象URL: ${testUrl}
- DOM実測セレクタカタログ(JSON): ${selectorCatalog}

【要件】
1. test()関数を使用したPlaywright形式
2. tests/scenario-home.ts の gotoHomeForScenario を使い、ホーム遷移は await gotoHomeForScenario(page); で実装すること
3. page.goto()を使う場合は完全なURL（${testUrl} から始まる絶対URL）を使用すること。相対パスは使用禁止
4. 生成コード先頭で import { gotoHomeForScenario } from './scenario-home'; を追加すること
5. テスト目的に沿った操作手順を実装
6. expect()で期待結果を検証
7. わかりやすいコメントを含める
8. 認証状態は既にロード済みと仮定
9. セレクタはDOM実測セレクタカタログに存在するものを優先使用すること
10. カタログに無いセレクタを推測で作らないこと（必要なら TODO コメントで不足情報を明示）

【出力形式】
TypeScriptコードのみを出力してください。説明文は不要です。`;
  }

  extractCode(response) {
    const codeBlockMatch = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    return response.trim();
  }

  async generateTestCode(testCase, testUrl, context = {}) {
    if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error('エラー: Claude APIキーが設定されていません\nconfig/config.json の anthropic.apiKey を設定してください');
    }

    const client = new Anthropic({ apiKey: this.apiKey });
    const prompt = this.buildPrompt(testCase, testUrl, context);

    try {
      const message = await client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = message.content[0].text;
      return this.extractCode(responseText);
    } catch (error) {
      throw new Error(
        `エラー: Claude APIの呼び出しに失敗しました\n- APIキーを確認してください\n- ネットワーク接続を確認してください\n詳細: ${error.message}`
      );
    }
  }
}

module.exports = { ClaudeClient };
