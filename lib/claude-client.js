const Anthropic = require('@anthropic-ai/sdk');

class ClaudeClient {
  constructor({ apiKey, model }) {
    this.apiKey = apiKey;
    this.model = model;
  }

  buildPrompt(testCase) {
    return `あなたはPlaywrightテストコード生成の専門家です。
以下のテストケース情報から、Playwrightのテストコードを生成してください。

【テスト情報】
- テストID: ${testCase.testId}
- テスト目的: ${testCase.purpose}
- 前提条件: ${testCase.precondition}
- 期待結果: ${testCase.expected}

【要件】
1. test()関数を使用したPlaywright形式
2. テスト目的に沿った操作手順を実装
3. expect()で期待結果を検証
4. わかりやすいコメントを含める
5. 認証状態は既にロード済みと仮定

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

  async generateTestCode(testCase) {
    if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error('エラー: Claude APIキーが設定されていません\nconfig/config.json の anthropic.apiKey を設定してください');
    }

    const client = new Anthropic({ apiKey: this.apiKey });
    const prompt = this.buildPrompt(testCase);

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
