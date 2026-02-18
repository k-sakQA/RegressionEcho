
const { chromium } = require('playwright');

module.exports = async () => {
  const browser = await chromium.launch({ headless: false });

  try {
    const context = await browser.newContext({ storageState: '/Users/kazunori.sakata.ts/MIXITools/RegressionEcho/storage/auth.json' });
    const page = await context.newPage();
    const targetUrl = 'https://development.pocket-heroes.net/home';
    const expectedPath = '/home';
    const firstHomeDialogCloseButtonSelector = 'body > dialog.ModalDialogBox_dialogBox__8_dsu.undefined > div > div.ContentWithBottomActions_bottomActionsContents__w8Vlw > button';
    const firstHomeDialogCloseImageSelector = 'body > dialog.ModalDialogBox_dialogBox__8_dsu.undefined > div > div.ContentWithBottomActions_bottomActionsContents__w8Vlw > button > img';
    const genericHomeDialogSelector = 'dialog.ModalDialogBox_dialogBox__8_dsu';
    const openDialogOkSelector = 'dialog[open] button:has-text("OK")';
    const timeoutMs = 120000;
    const pollIntervalMs = 5000;
    const deadline = Date.now() + timeoutMs;

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    while (Date.now() < deadline) {
      const currentUrl = page.url();
      let currentPath = '';

      try {
        currentPath = new URL(currentUrl).pathname;
      } catch {
        currentPath = currentUrl;
      }

      if (currentPath.includes(expectedPath)) {
        try {
          const closeButton = page.locator(firstHomeDialogCloseButtonSelector).first();
          if (await closeButton.count() > 0) {
            await closeButton.click({ timeout: 5000, force: true });
          } else {
            await page.locator(firstHomeDialogCloseImageSelector).first().click({ timeout: 5000, force: true });
          }
          await page.waitForTimeout(500);
        } catch {
        }

        for (let i = 0; i < 5; i += 1) {
          try {
            const genericDialog = page.locator(genericHomeDialogSelector).first();
            if (await genericDialog.count() === 0) {
              break;
            }
            const dialogButton = genericDialog.locator('button').last();
            if (await dialogButton.count() > 0) {
              await dialogButton.click({ timeout: 3000, force: true });
              await page.waitForTimeout(250);
              continue;
            }
            break;
          } catch {
            break;
          }
        }

        for (let i = 0; i < 3; i += 1) {
          try {
            const okButton = page.locator(openDialogOkSelector).first();
            if (await okButton.count() === 0) {
              break;
            }
            await okButton.click({ timeout: 3000, force: true });
            await page.waitForTimeout(300);
          } catch {
            break;
          }
        }

        await page.evaluate(() => {
          const dialogs = Array.from(document.querySelectorAll('dialog.ModalDialogBox_dialogBox__8_dsu'));
          for (const dialog of dialogs) {
            if (typeof dialog.close === 'function') {
              dialog.close();
            }
            dialog.removeAttribute('open');
          }
          const overlays = Array.from(document.querySelectorAll('[class*="TapAreaOverlay_blockingOverlay"]'));
          for (const overlay of overlays) {
            overlay.remove();
          }
        });

        try {
          await context.storageState({ path: '/Users/kazunori.sakata.ts/MIXITools/RegressionEcho/storage/auth.json', indexedDB: true });
        } catch {
          await context.storageState({ path: '/Users/kazunori.sakata.ts/MIXITools/RegressionEcho/storage/auth.json' });
        }
        return;
      }

      const remaining = Math.max(0, deadline - Date.now());
      if (remaining === 0) {
        break;
      }

      await page.waitForTimeout(Math.min(pollIntervalMs, remaining));
    }

    throw new Error(
      '認証エラー: 認証済みURLへの到達確認に失敗しました。' +
      '期待パス=' + expectedPath + ' / 現在URL=' + page.url() +
      '。playwright-regression auth を再実行してください。'
    );
  } finally {
    await browser.close();
  }
};
