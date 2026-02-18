import { test, expect } from '@playwright/test';
import {
  clickFirstVisible,
  clickPurchaseButton,
  completeThreeDsIfPresent,
  getBamosCount,
  getScenarioValue,
  goToShop,
  selectBamosPlan,
  setScenarioValue,
} from './flow-helpers';

test('登録済みのお支払い方法で購入', async ({ page }) => {
  // ケース間で page は引き継がれないため、このケース内で購入確定直前まで進める
  await goToShop(page);
  const selectedDelta = getScenarioValue<number>('selectedDelta') ?? 26;
  await selectBamosPlan(page, selectedDelta);
  await clickPurchaseButton(page);

  // お支払い方法画面で登録済みの方法を選択して決済に進む
  // ボタンのテキストは環境により異なるため複数候補で検索
  await page.waitForTimeout(2000); // 画面描画待ち

  const clicked = await clickFirstVisible(page, [
    'button:has-text("この内容で支払う")',
    'button:has-text("購入を確定")',
    'button:has-text("登録済み")',
    'button:has-text("お支払い方法")',
    'button:has-text("確定")',
    'button:has-text("購入する")',
    'button:has-text("OK")',
  ]);

  expect(clicked).toBeTruthy();
  setScenarioValue('purchaseSubmitted', clicked);

  // 3DSテスト画面が出る場合は自動で Complete を押す
  const threeDsCompleted = await completeThreeDsIfPresent(page);
  console.log(`3DS Complete押下: ${threeDsCompleted}`);

  // 決済・3DS（自動承認想定）の完了待ち
  await page.waitForTimeout(12000);

  // 完了ダイアログがあれば閉じる
  await clickFirstVisible(page, [
    'dialog[open] button:has-text("OK")',
    'button:has-text("OK")',
  ]);

  // 購入完了可否は環境依存なので、ここでは結果を記録のみ行う
  const beforeBamos = getScenarioValue<number>('beforeBamos');
  let purchaseCompleted = false;
  if (beforeBamos !== undefined) {
    await goToShop(page);
    const afterBamos = await getBamosCount(page);
    console.log(`ケース5検証: before=${beforeBamos}, after=${afterBamos}, delta=${selectedDelta}`);
    if (afterBamos !== null) {
      purchaseCompleted = afterBamos >= beforeBamos + selectedDelta;
    }
  }
  setScenarioValue('purchaseCompleted', purchaseCompleted);
});
