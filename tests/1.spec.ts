import { test, expect } from '@playwright/test';
import { ensureHome, goToShop } from './flow-helpers';

test('テストID-1 - ホームからSHOP画面へ遷移', async ({ page }) => {
  // ホーム画面に遷移（ダイアログをすべて閉じる）
  await ensureHome(page);
  await expect(page).toHaveURL(/\/home/, { timeout: 30000 });

  // SHOP画面へ遷移
  await goToShop(page);
  await expect(page).toHaveURL(/\/shop/, { timeout: 30000 });

  // バモス購入ボタンが表示されていることを確認
  await expect(page.locator('button:has-text("バモス")').first()).toBeVisible({ timeout: 15000 });
});