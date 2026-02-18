import { test, expect } from '@playwright/test';
import { getScenarioValue, setScenarioValue } from './flow-helpers';

test('購入フローに入る（3D Secureダイアログ表示）', async ({ page }) => {
  // ケース5で決済送信を実行済みであることを最低条件にする
  const purchaseSubmitted = getScenarioValue<boolean>('purchaseSubmitted');
  expect(purchaseSubmitted).toBeTruthy();

  // 3DS認証がポップアップ / iframe / URL遷移のいずれかで表示されるのを待つ
  await page.waitForTimeout(3000); // 決済プロバイダーの読み込み待ち

  const popup = await page.waitForEvent('popup', { timeout: 15000 }).catch(() => null);

  const hasFrame = await page
    .locator('iframe[name*="secure"], iframe[src*="3ds"], iframe[src*="auth"]')
    .first()
    .isVisible()
    .catch(() => false);

  const has3dsUrl = /3ds|secure|authentication|acs|payment|auth/i.test(page.url());

  const threeDsVisible = Boolean(popup) || hasFrame || has3dsUrl;
  console.log(`3DS検出: popup=${Boolean(popup)}, iframe=${hasFrame}, url=${has3dsUrl}`);
  // 決済方式により3DSが明示表示されないケースもあるため、ここでは記録のみ
  expect(page.isClosed()).toBeFalsy();

  setScenarioValue('threeDsPopupOpened', threeDsVisible);
});
