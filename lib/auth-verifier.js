class AuthVerifier {
  constructor(options = {}) {
    this.enabled = Boolean(options.enabled);
    this.urlIncludes = options.urlIncludes || '';
    this.visibleSelectors = Array.isArray(options.visibleSelectors) ? options.visibleSelectors : [];
    this.timeoutMs = options.timeoutMs || 15000;
    this.pollIntervalMs = options.pollIntervalMs || 5000;
  }

  hasChecks() {
    return Boolean(this.urlIncludes) || this.visibleSelectors.length > 0;
  }

  async verify(page) {
    if (!this.enabled) {
      return;
    }

    if (!this.hasChecks()) {
      throw new Error(
        'エラー: 認証検証が有効ですが、検証条件が未設定です\nauthVerification.urlIncludes または authVerification.visibleSelectors を設定してください'
      );
    }

    if (this.urlIncludes) {
      try {
        await this.waitForUrlByPolling(page);
      } catch (error) {
        if (error && error.name === 'TimeoutError') {
          const currentUrl = typeof page.url === 'function' ? page.url() : '(取得不可)';
          throw new Error(
            `エラー: 認証後URLの検証に失敗しました\n` +
              `期待: URL に "${this.urlIncludes}" を含む\n` +
              `現在: ${currentUrl}\n` +
              `補足: ${Math.round(this.pollIntervalMs / 1000)}秒間隔で確認しました\n` +
              '対処: --check-url の値を見直すか、必要に応じて --skip-check を利用してください'
          );
        }
        throw error;
      }
    }

    for (const selector of this.visibleSelectors) {
      try {
        await page.locator(selector).first().waitFor({
          state: 'visible',
          timeout: this.timeoutMs,
        });
      } catch (error) {
        if (error && error.name === 'TimeoutError') {
          const currentUrl = typeof page.url === 'function' ? page.url() : '(取得不可)';
          throw new Error(
            `エラー: 認証後セレクタの検証に失敗しました\n` +
              `期待: ${selector} が表示される\n` +
              `現在URL: ${currentUrl}\n` +
              '対処: 正しいセレクタを --check-selector で指定するか、必要に応じて --skip-check を利用してください'
          );
        }
        throw error;
      }
    }
  }

  async waitForUrlByPolling(page) {
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      const remainingMs = deadline - Date.now();
      const waitMs = Math.min(this.pollIntervalMs, remainingMs);

      try {
        await page.waitForURL((url) => url.toString().includes(this.urlIncludes), {
          timeout: waitMs,
        });
        return;
      } catch (error) {
        if (error && error.name === 'TimeoutError') {
          continue;
        }
        throw error;
      }
    }

    const timeoutError = new Error('Timed out while polling URL');
    timeoutError.name = 'TimeoutError';
    throw timeoutError;
  }
}

module.exports = { AuthVerifier };
