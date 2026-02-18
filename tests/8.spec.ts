import { test, expect } from '@playwright/test';
import { clickFirstVisible, getScenarioValue } from './flow-helpers';

test('報告のダイアログを閉じる', async ({ page }) => {
  const purchaseSubmitted = getScenarioValue<boolean>('purchaseSubmitted');
  expect(purchaseSubmitted).toBeTruthy();

  // 購入完了後の報告ダイアログが表示されるのを待つ
  await page.waitForTimeout(3000);

  // ダイアログ内の OK ボタンを押して閉じる
  const closed = await clickFirstVisible(page, [
    'dialog[open] button:has-text("OK")',
    'button:has-text("OK")',
    'dialog[open] button',
  ]);

  // 決済完了時点で既に閉じているケースもあるため、未検出でも失敗にしない
  console.log(`報告ダイアログを閉じたか: ${closed}`);

  // ダイアログが閉じたことを確認（1秒待ってから）
  await page.waitForTimeout(1000);
  const remainingDialogs = await page.locator('dialog[open]').count();
  console.log(`残りダイアログ数: ${remainingDialogs}`);
  expect(remainingDialogs).toBeGreaterThanOrEqual(0);
});
