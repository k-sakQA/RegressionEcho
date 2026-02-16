const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestExecutor {
  constructor(testsDir, projectDir) {
    this.testsDir = testsDir;
    this.projectDir = projectDir;
  }

  listTestFiles(filterIds) {
    if (!fs.existsSync(this.testsDir)) {
      return [];
    }

    let files = fs.readdirSync(this.testsDir).filter((f) => f.endsWith('.spec.ts'));

    if (filterIds && filterIds.length > 0) {
      files = files.filter((f) => {
        const testId = f.replace('.spec.ts', '');
        return filterIds.includes(testId);
      });
    }

    return files;
  }

  buildCommand(testFiles, options) {
    const filePaths = testFiles.map((f) => path.join(this.testsDir, f)).join(' ');
    return `npx playwright test ${filePaths} --reporter=html`;
  }

  async run(filterIds, options) {
    const testFiles = this.listTestFiles(filterIds);

    if (testFiles.length === 0) {
      console.log('実行するテストが見つかりません。');
      return { exitCode: 0, testCount: 0 };
    }

    const configPath = this.generatePlaywrightConfig(options);
    const filePaths = testFiles.map((f) => path.join(this.testsDir, f)).join(' ');
    const cmd = `npx playwright test ${filePaths} --config=${configPath}`;

    console.log('テストを実行中...\n');

    try {
      execSync(cmd, { cwd: this.projectDir, stdio: 'inherit' });
      return { exitCode: 0, testCount: testFiles.length };
    } catch (error) {
      return { exitCode: error.status || 1, testCount: testFiles.length };
    }
  }

  generatePlaywrightConfig(options) {
    const configPath = path.join(this.projectDir, 'playwright.config.js');
    const reportDir = path.join(this.projectDir, 'playwright-report');

    const configContent = `
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '${this.testsDir.replace(/\\/g, '\\\\')}',
  timeout: ${options.timeout || 30000},
  use: {
    baseURL: '${(options.baseURL || '').replace(/\\/g, '\\\\')}',
    storageState: '${(options.authPath || '').replace(/\\/g, '\\\\')}',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [['html', { outputFolder: '${reportDir.replace(/\\/g, '\\\\')}', open: 'never' }]],
  workers: 1,
});
`;

    fs.writeFileSync(configPath, configContent);
    return configPath;
  }
}

module.exports = { TestExecutor };
