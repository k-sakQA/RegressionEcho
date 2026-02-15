const fs = require('fs');
const path = require('path');

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

  async runAuthFlow(testUrl) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('ブラウザを起動します...');
    await page.goto(testUrl);

    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    await new Promise((resolve) => {
      rl.question('認証を完了したら Enter キーを押してください: ', () => {
        rl.close();
        resolve();
      });
    });

    const state = await context.storageState();
    this.saveAuthState(state);

    await browser.close();
    console.log(`✓ 認証状態を保存しました: ${this.authPath}`);
  }
}

module.exports = { AuthManager };
