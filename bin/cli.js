#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const { AuthManager } = require('../lib/auth');
const { readTestCases } = require('../lib/csv-reader');
const { ClaudeClient } = require('../lib/claude-client');
const { TestGenerator } = require('../lib/test-generator');
const { TestExecutor } = require('../lib/test-executor');

const CONFIG_TEMPLATE = {
  anthropic: {
    apiKey: 'YOUR_API_KEY_HERE',
    model: 'claude-sonnet-4-5-20250929',
  },
  playwright: {
    headless: false,
    timeout: 30000,
  },
  testUrl: 'https://your-test-environment.example.com',
};

function loadConfig(projectDir) {
  const configPath = path.join(projectDir, 'config', 'config.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (process.env.ANTHROPIC_API_KEY) {
    config.anthropic.apiKey = process.env.ANTHROPIC_API_KEY;
  }
  return config;
}

function createProgram(projectDir) {
  const program = new Command();

  program
    .name('playwright-regression')
    .description('リグレッションテストを効率化するCLIツール')
    .version('1.0.0');

  // init command
  program
    .command('init')
    .option('--skip-browsers', 'ブラウザインストールをスキップ')
    .description('プロジェクト初期化・設定ファイル生成')
    .action(async (opts) => {
      const configDir = path.join(projectDir, 'config');
      const configPath = path.join(configDir, 'config.json');

      // Create config file if not exists
      fs.mkdirSync(configDir, { recursive: true });
      if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify(CONFIG_TEMPLATE, null, 2));
        console.log('✓ 設定ファイルを作成しました: config/config.json');
      } else {
        console.log('設定ファイルは既に存在します: config/config.json');
      }

      // Create directories
      fs.mkdirSync(path.join(projectDir, 'storage'), { recursive: true });
      fs.mkdirSync(path.join(projectDir, 'tests'), { recursive: true });
      console.log('✓ ディレクトリを作成しました');

      // Playwright browser install
      if (!opts.skipBrowsers) {
        try {
          const { execSync } = require('child_process');
          execSync('npx playwright install chromium', { stdio: 'inherit' });
          console.log('✓ Playwrightブラウザをインストールしました');
        } catch {
          console.log('⚠ Playwrightブラウザのインストールをスキップしました');
        }
      }

      console.log('\n次のステップ:');
      console.log('1. config/config.json に Claude APIキーを設定してください');
      console.log('2. playwright-regression auth で認証状態を保存してください');
    });

  // auth command
  program
    .command('auth')
    .description('認証状態の保存')
    .action(async () => {
      const config = loadConfig(projectDir);
      if (!config) {
        console.error('エラー: 設定ファイルが見つかりません\nplaywright-regression init を実行してください');
        return;
      }

      const auth = new AuthManager(path.join(projectDir, 'storage'));
      await auth.runAuthFlow(config.testUrl);
    });

  // generate command
  program
    .command('generate')
    .argument('<csv>', 'テストケースCSVファイルパス')
    .option('--only <ids>', '特定のテストIDのみ生成（カンマ区切り）')
    .description('CSVからテストスクリプト生成')
    .action(async (csvFile, options) => {
      const config = loadConfig(projectDir);
      if (!config) {
        console.error('エラー: 設定ファイルが見つかりません\nplaywright-regression init を実行してください');
        return;
      }

      const filterIds = options.only ? options.only.split(',') : undefined;

      let testCases;
      try {
        testCases = await readTestCases(csvFile, filterIds);
      } catch (error) {
        console.error(error.message);
        return;
      }

      const claudeClient = new ClaudeClient(config.anthropic);
      const generator = new TestGenerator(claudeClient, path.join(projectDir, 'tests'));

      console.log('テストスクリプトを生成中...');
      const results = await generator.generate(testCases, config.testUrl);

      let successCount = 0;
      for (const result of results) {
        if (result.success) {
          console.log(`✓ ${result.testId}.spec.ts を生成しました`);
          successCount++;
        } else {
          console.error(`✗ ${result.testId}.spec.ts の生成に失敗しました: ${result.error}`);
        }
      }

      console.log(`\n${successCount}件のテストスクリプトを生成しました。`);
      console.log('tests/ ディレクトリを確認してください。');
      console.log('\n次のステップ:');
      console.log('playwright-regression run でテストを実行してください');
    });

  // run command
  program
    .command('run')
    .argument('[testIds...]', '実行するテストID')
    .description('テスト実行')
    .action(async (testIds) => {
      const config = loadConfig(projectDir);
      if (!config) {
        console.error('エラー: 設定ファイルが見つかりません\nplaywright-regression init を実行してください');
        return;
      }

      const auth = new AuthManager(path.join(projectDir, 'storage'));
      if (!auth.hasStoredAuth()) {
        console.error('エラー: 認証状態が見つかりません\nplaywright-regression auth を実行してください');
        return;
      }

      const executor = new TestExecutor(path.join(projectDir, 'tests'), projectDir);
      const filterIds = testIds.length > 0 ? testIds : undefined;

      const result = await executor.run(filterIds, {
        authPath: auth.getAuthPath(),
        timeout: config.playwright.timeout,
        baseURL: config.testUrl,
      });

      if (result.testCount > 0) {
        console.log('\nレポートを表示するには: playwright-regression report');
      }
    });

  // report command
  program
    .command('report')
    .description('レポート表示')
    .action(async () => {
      const reportPath = path.join(projectDir, 'playwright-report', 'index.html');
      if (!fs.existsSync(reportPath)) {
        console.error('エラー: レポートが見つかりません\nplaywright-regression run を先に実行してください');
        return;
      }

      console.log('レポートを表示します...');
      const { exec } = require('child_process');
      const platform = process.platform;
      const openCmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
      exec(`${openCmd} ${reportPath}`);
    });

  return program;
}

// Export for testing
module.exports = { createProgram, loadConfig };

// Run if called directly
if (require.main === module) {
  const program = createProgram(process.cwd());
  program.parse();
}
