import { test, expect } from '@playwright/test';

test('テストID-4 - ダイアログで「購入する」押下', async ({ page }) => {
  // 確認ダイアログの「購入する」ボタンをクリック
  // dialog[open] 内のボタンを探す。見つからない場合は dispatchEvent で直接発火
  let clicked = false;
  const buyInDialog = page.locator('dialog[open] button:has-text("購入する")').first();
  if (await buyInDialog.count()) {
    await buyInDialog.click({ timeout: 10000, force: true });
    clicked = true;
  }

  if (!clicked) {
    // dialog[open] がない場合、DOM上の「購入する」に dispatchEvent
    const buyButton = page.locator('button:has-text("購入する")').first();
    await buyButton.dispatchEvent('click');
  }

  // お支払い方法画面 or 決済画面への遷移を待つ
  const transitioned = await Promise.race([
    page.waitForURL(/payment|pay|secure|3ds|auth|checkout/i, { timeout: 30000 })
      .then(() => true).catch(() => false),
    page.locator('text=/お支払い|決済|支払い方法|3D Secure|認証|購入を確定/i').first()
      .waitFor({ state: 'visible', timeout: 30000 })
      .then(() => true).catch(() => false),
  ]);

  expect(transitioned).toBeTruthy();
});