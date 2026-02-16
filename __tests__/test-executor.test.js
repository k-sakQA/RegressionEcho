const path = require('path');
const fs = require('fs');
const os = require('os');
const { TestExecutor } = require('../lib/test-executor');

describe('test-executor', () => {
  let tmpDir;
  let testsDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'executor-test-'));
    testsDir = path.join(tmpDir, 'tests');
    fs.mkdirSync(testsDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('テストファイルの一覧を取得できる', () => {
    fs.writeFileSync(path.join(testsDir, 'TC001.spec.ts'), 'test code');
    fs.writeFileSync(path.join(testsDir, 'TC002.spec.ts'), 'test code');
    fs.writeFileSync(path.join(testsDir, 'README.md'), 'not a test');

    const executor = new TestExecutor(testsDir, tmpDir);
    const files = executor.listTestFiles();

    expect(files).toHaveLength(2);
    expect(files).toContain('TC001.spec.ts');
    expect(files).toContain('TC002.spec.ts');
  });

  test('テストIDでフィルタリングできる', () => {
    fs.writeFileSync(path.join(testsDir, 'TC001.spec.ts'), 'test code');
    fs.writeFileSync(path.join(testsDir, 'TC002.spec.ts'), 'test code');
    fs.writeFileSync(path.join(testsDir, 'TC003.spec.ts'), 'test code');

    const executor = new TestExecutor(testsDir, tmpDir);
    const files = executor.listTestFiles(['TC001', 'TC003']);

    expect(files).toHaveLength(2);
    expect(files).toContain('TC001.spec.ts');
    expect(files).toContain('TC003.spec.ts');
  });

  test('テストディレクトリが空の場合は空配列', () => {
    const executor = new TestExecutor(testsDir, tmpDir);
    const files = executor.listTestFiles();
    expect(files).toHaveLength(0);
  });

  test('Playwrightコマンドを正しく構築できる', () => {
    const executor = new TestExecutor(testsDir, tmpDir);
    const authPath = path.join(tmpDir, 'storage', 'auth.json');
    const reportDir = path.join(tmpDir, 'playwright-report');

    const cmd = executor.buildCommand(['TC001.spec.ts', 'TC002.spec.ts'], {
      authPath,
      reportDir,
      timeout: 30000,
    });

    expect(cmd).toContain('npx playwright test');
    expect(cmd).toContain('TC001.spec.ts');
    expect(cmd).toContain('TC002.spec.ts');
  });

  test('Playwright設定にbaseURLが含まれる', () => {
    const executor = new TestExecutor(testsDir, tmpDir);
    const authPath = path.join(tmpDir, 'storage', 'auth.json');

    const configPath = executor.generatePlaywrightConfig({
      authPath,
      timeout: 30000,
      baseURL: 'https://hotel-example-site.takeyaqa.dev/ja/reserve.html',
    });

    const configContent = fs.readFileSync(configPath, 'utf-8');
    expect(configContent).toContain('https://hotel-example-site.takeyaqa.dev/ja/reserve.html');
    expect(configContent).toContain('baseURL');
  });
});
