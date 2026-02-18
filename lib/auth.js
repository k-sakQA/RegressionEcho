const fs = require('fs');
const path = require('path');
const { AuthVerifier } = require('./auth-verifier');

class AuthManager {
  constructor(storageDir) {
    this.storageDir = storageDir;
    this.authPath = path.join(storageDir, 'auth.json');
  }

  getAuthPath() {
    return this.authPath;
  }

  hasStoredAuth() {
    return fs.existsSync(this.authPath);
  }

  saveAuthState(state) {
    fs.mkdirSync(this.storageDir, { recursive: true });
    fs.writeFileSync(this.authPath, JSON.stringify(state, null, 2));
  }

  loadAuthState() {
    if (!this.hasStoredAuth()) {
      throw new Error('エラー: 認証状態が見つかりません\nplaywright-regression auth を実行してください');
    }
    return JSON.parse(fs.readFileSync(this.authPath, 'utf-8'));
  }

  async runAuthFlow(testUrl, verificationOptions = {}) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: false });
    let rl;

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      console.log('ブラウザを起動します...');
      await page.goto(testUrl);

      const readline = require('readline');
      rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      await new Promise((resolve) => {
        rl.question('認証を完了したら Enter キーを押してください: ', () => {
          rl.close();
          rl = null;
          resolve();
        });
      });

      const expectedPath = this.resolveExpectedPath(testUrl, verificationOptions);
      console.log(`認証完了待機中... (${Math.round((verificationOptions.timeoutMs || 120000) / 1000)}秒, 5秒間隔)`);
      await this.waitForExpectedUrlByPolling(
        page,
        expectedPath,
        verificationOptions.timeoutMs || 120000,
        verificationOptions.pollIntervalMs || 5000
      );
      console.log(`✓ 認証後URLを確認しました: ${page.url()}`);

      const verifier = new AuthVerifier(verificationOptions);
      if (verifier.enabled) {
        console.log('認証状態を検証中...');
        await verifier.verify(page);
        console.log('✓ 認証状態の検証に成功しました');
      }

      await this.dismissInitialHomeDialogIfPresent(page);

      let state;
      try {
        state = await context.storageState({ indexedDB: true });
      } catch {
        state = await context.storageState();
      }
      this.saveAuthState(state);

      console.log(`✓ 認証状態を保存しました: ${this.authPath}`);
    } finally {
      if (rl) {
        rl.close();
      }
      await browser.close();
    }
  }

  resolveExpectedPath(testUrl, verificationOptions = {}) {
    if (verificationOptions.urlIncludes) {
      return verificationOptions.urlIncludes;
    }

    try {
      const parsed = new URL(testUrl);
      return parsed.pathname || '/home';
    } catch {
      return '/home';
    }
  }

  async waitForExpectedUrlByPolling(page, expectedPath, timeoutMs = 120000, pollIntervalMs = 5000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const currentUrl = typeof page.url === 'function' ? page.url() : '';
      if (currentUrl.includes(expectedPath)) {
        return;
      }

      const remainingMs = deadline - Date.now();
      const waitMs = Math.min(pollIntervalMs, remainingMs);
      if (waitMs <= 0) {
        break;
      }

      await page.waitForTimeout(waitMs);
    }

    const currentUrl = typeof page.url === 'function' ? page.url() : '(取得不可)';
    throw new Error(
      `エラー: 認証完了待機がタイムアウトしました\n` +
        `期待: URL に "${expectedPath}" を含む\n` +
        `現在: ${currentUrl}\n` +
        '対処: JリーグIDログイン完了後に /home が表示されたことを確認して Enter を押してください'
    );
  }

  async dismissInitialHomeDialogIfPresent(page) {
    const currentUrl = typeof page.url === 'function' ? page.url() : '';
    if (!currentUrl.includes('/home')) {
      return;
    }

    try {
      const closeButton = page.locator('button:has(img[src="/images/ui/cross.svg"])').first();
      await closeButton.waitFor({ state: 'visible', timeout: 3000 });
      await closeButton.click();
      console.log('✓ /home 初回ダイアログを閉じました');
    } catch {
      // ダイアログが出ないケースは正常系として扱う
    }
  }
}

module.exports = { AuthManager };
