const path = require('path');
const fs = require('fs');
const os = require('os');
const { TestGenerator } = require('../lib/test-generator');

describe('test-generator', () => {
  let tmpDir;
  let testsDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-test-'));
    testsDir = path.join(tmpDir, 'tests');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('テストコードをファイルに保存できる', async () => {
    const mockClaudeClient = {
      generateTestCode: jest.fn().mockResolvedValue(
        "import { test, expect } from '@playwright/test';\n\ntest('TC001: テスト', async ({ page }) => {});"
      ),
    };

    const generator = new TestGenerator(mockClaudeClient, testsDir);
    const testCase = {
      testId: 'TC001',
      purpose: 'テスト目的',
      precondition: '前提条件',
      expected: '期待結果',
    };

    await generator.generate([testCase]);

    const filePath = path.join(testsDir, 'TC001.spec.ts');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("import { test, expect }");
  });

  test('複数のテストケースを一括生成できる', async () => {
    const mockClaudeClient = {
      generateTestCode: jest.fn()
        .mockResolvedValueOnce("import { test } from '@playwright/test';\ntest('TC001', async () => {});")
        .mockResolvedValueOnce("import { test } from '@playwright/test';\ntest('TC002', async () => {});"),
    };

    const generator = new TestGenerator(mockClaudeClient, testsDir);
    const testCases = [
      { testId: 'TC001', purpose: '目的1', precondition: '前提1', expected: '期待1' },
      { testId: 'TC002', purpose: '目的2', precondition: '前提2', expected: '期待2' },
    ];

    const results = await generator.generate(testCases);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
    expect(fs.existsSync(path.join(testsDir, 'TC001.spec.ts'))).toBe(true);
    expect(fs.existsSync(path.join(testsDir, 'TC002.spec.ts'))).toBe(true);
    expect(mockClaudeClient.generateTestCode).toHaveBeenCalledTimes(2);
  });

  test('API失敗時にエラー結果を返す（他のテストは継続）', async () => {
    const mockClaudeClient = {
      generateTestCode: jest.fn()
        .mockResolvedValueOnce("import { test } from '@playwright/test';\ntest('TC001', async () => {});")
        .mockRejectedValueOnce(new Error('API error')),
    };

    const generator = new TestGenerator(mockClaudeClient, testsDir);
    const testCases = [
      { testId: 'TC001', purpose: '目的1', precondition: '前提1', expected: '期待1' },
      { testId: 'TC002', purpose: '目的2', precondition: '前提2', expected: '期待2' },
    ];

    const results = await generator.generate(testCases);

    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
    expect(results[1].error).toBeDefined();
  });

  test('testsディレクトリが存在しない場合は自動作成', async () => {
    const mockClaudeClient = {
      generateTestCode: jest.fn().mockResolvedValue("test('TC001', async () => {});"),
    };

    const deepTestsDir = path.join(tmpDir, 'deep', 'nested', 'tests');
    const generator = new TestGenerator(mockClaudeClient, deepTestsDir);

    await generator.generate([
      { testId: 'TC001', purpose: '目的', precondition: '前提', expected: '期待' },
    ]);

    expect(fs.existsSync(path.join(deepTestsDir, 'TC001.spec.ts'))).toBe(true);
  });
});
