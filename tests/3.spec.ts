import { test, expect } from '@playwright/test';
import { goToShop, selectBamosPlan, setScenarioValue } from './flow-helpers';

test('テストID-3 - 商品を選択する', async ({ page }) => {
  await goToShop(page);

  // バモス ×26 プランを選択（確認ダイアログが開く）
  const selectedDelta = await selectBamosPlan(page, 26);
  setScenarioValue('selectedDelta', selectedDelta);
  console.log(`選択プラン: バモス ×${selectedDelta}`);

  // 確認ダイアログが開いている、または「購入する」ボタンがDOMに存在することを確認
  const buyButtonExists = await page.locator('button:has-text("購入する")').first().count();
  expect(buyButtonExists).toBeGreaterThan(0);

  // ダイアログが open であることを確認（selectBamosPlan が強制的に開く）
  const hasOpenDialog = await page.locator('dialog[open]').count();
  console.log(`openダイアログ数: ${hasOpenDialog}`);
  expect(hasOpenDialog).toBeGreaterThan(0);
});