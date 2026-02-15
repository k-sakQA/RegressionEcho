const path = require('path');
const fs = require('fs');
const os = require('os');
const { createProgram } = require('../bin/cli');

describe('CLI', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('initコマンドで設定ファイルとディレクトリが作成される', async () => {
    const program = createProgram(tmpDir);
    program.exitOverride();

    await program.parseAsync(['node', 'playwright-regression', 'init', '--skip-browsers']);

    expect(fs.existsSync(path.join(tmpDir, 'config', 'config.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'storage'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'tests'))).toBe(true);

    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, 'config', 'config.json'), 'utf-8'));
    expect(config.anthropic.apiKey).toBe('YOUR_API_KEY_HERE');
    expect(config.anthropic.model).toBe('claude-sonnet-4-5-20250929');
    expect(config.testUrl).toBeDefined();
  });

  test('initコマンドで既存の設定ファイルは上書きしない', async () => {
    const configDir = path.join(tmpDir, 'config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({ custom: true }));

    const program = createProgram(tmpDir);
    program.exitOverride();

    await program.parseAsync(['node', 'playwright-regression', 'init', '--skip-browsers']);

    const config = JSON.parse(fs.readFileSync(path.join(configDir, 'config.json'), 'utf-8'));
    expect(config.custom).toBe(true);
  });

  test('設定ファイルがない状態でgenerateを呼ぶとエラー', async () => {
    const program = createProgram(tmpDir);
    program.exitOverride();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await program.parseAsync(['node', 'playwright-regression', 'generate', 'test.csv']);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('設定ファイルが見つかりません')
    );

    consoleSpy.mockRestore();
  });

  test('loadConfig は環境変数 ANTHROPIC_API_KEY を優先する', async () => {
    const configDir = path.join(tmpDir, 'config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify({
      anthropic: { apiKey: 'file-key', model: 'claude-sonnet-4-5-20250929' },
      playwright: { headless: false, timeout: 30000 },
      testUrl: 'https://example.com',
    }));

    const originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'env-key';

    try {
      const { loadConfig } = require('../bin/cli');
      const config = loadConfig(tmpDir);
      expect(config.anthropic.apiKey).toBe('env-key');
    } finally {
      if (originalEnv === undefined) {
        delete process.env.ANTHROPIC_API_KEY;
      } else {
        process.env.ANTHROPIC_API_KEY = originalEnv;
      }
    }
  });
});
