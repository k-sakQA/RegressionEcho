const { ClaudeClient } = require('../lib/claude-client');

describe('claude-client', () => {
  test('プロンプトを正しく構築できる', () => {
    const client = new ClaudeClient({ apiKey: 'test-key', model: 'claude-sonnet-4-5-20250929' });

    const prompt = client.buildPrompt({
      testId: 'TC001',
      purpose: '100円ガチャ購入で通貨10個増加確認',
      precondition: 'ログイン済み・通貨100個以上保有',
      expected: '購入前後で通貨が10個増加していること',
    }, 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html');

    expect(prompt).toContain('TC001');
    expect(prompt).toContain('100円ガチャ購入で通貨10個増加確認');
    expect(prompt).toContain('ログイン済み・通貨100個以上保有');
    expect(prompt).toContain('購入前後で通貨が10個増加していること');
    expect(prompt).toContain('Playwrightテストコード生成の専門家');
    expect(prompt).toContain('TypeScriptコードのみを出力');
    expect(prompt).toContain('https://hotel-example-site.takeyaqa.dev/ja/reserve.html');
    expect(prompt).toContain("import { gotoHomeForScenario } from './scenario-home';");
    expect(prompt).toContain('await gotoHomeForScenario(page);');
  });

  test('APIレスポンスからコードを抽出できる', () => {
    const client = new ClaudeClient({ apiKey: 'test-key', model: 'claude-sonnet-4-5-20250929' });

    const code = "import { test, expect } from '@playwright/test';\n\ntest('TC001', async ({ page }) => {});";
    const result = client.extractCode(code);
    expect(result).toContain("import { test, expect }");
  });

  test('コードブロック付きレスポンスからコードを抽出できる', () => {
    const client = new ClaudeClient({ apiKey: 'test-key', model: 'claude-sonnet-4-5-20250929' });

    const response = "```typescript\nimport { test } from '@playwright/test';\ntest('TC001', async () => {});\n```";
    const result = client.extractCode(response);
    expect(result).toBe("import { test } from '@playwright/test';\ntest('TC001', async () => {});");
  });

  test('APIキー未設定でgenerateを呼ぶとエラー', async () => {
    const client = new ClaudeClient({ apiKey: 'YOUR_API_KEY_HERE', model: 'claude-sonnet-4-5-20250929' });

    await expect(client.generateTestCode({
      testId: 'TC001',
      purpose: 'テスト',
      precondition: '前提',
      expected: '期待',
    })).rejects.toThrow('APIキーが設定されていません');
  });
});
